/** Consent-gated GA4 browser runtime. No request is made until an explicit grant. */
export function sanitizePathname(pathname, routeTemplates) {
  const path = (typeof pathname === 'string' ? pathname.split(/[?#]/, 1)[0] : '/')
    .replace(/\/+$/, '') || '/';
  // Only known route templates leave the browser; dynamic identifiers never do.
  return routeTemplates.find((template) => {
    const expected = template.split('/');
    const actual = path.split('/');
    return expected.length === actual.length && expected.every((part, index) =>
      /^\[[^\]]+\]$/.test(part) ? Boolean(actual[index]) : part === actual[index]);
  }) || '/other';
}

function validOrigin(siteUrl) {
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search ||
        url.hash || url.pathname !== '/' || url.hostname === 'localhost' ||
        url.hostname.endsWith('.localhost') || /^127\./.test(url.hostname) ||
        ['[::1]', '0.0.0.0'].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}

/**
 * @param {{measurementId: string, siteUrl: string, enabled: boolean, production: boolean,
 * deploymentEnv: string, appTitle: string, routeTemplates: string[]}} config
 * @param {Window & typeof globalThis} browser
 */
export function createAnalytics(config, browser) {
  const { measurementId, appTitle, routeTemplates } = config;
  const origin = validOrigin(config.siteUrl);
  const available = Boolean(config.enabled && config.production &&
    (!config.deploymentEnv || config.deploymentEnv === 'production') &&
    /^G-[A-Z0-9]{6,20}$/.test(measurementId) && origin &&
    browser.location.origin === origin);
  const consentKey = `app.analytics.consent.${measurementId}`;
  const states = browser.__appAnalyticsStates ||= {};
  const state = states[measurementId] ||= {
    consent: null, initialized: false, lastPathname: null, lastLocation: null,
  };

  function getConsent() {
    try {
      const stored = browser.localStorage.getItem(consentKey);
      const consent = stored === 'granted' || stored === 'denied' ? stored : null;
      // Missing/invalid storage is revocation, not a session fallback.
      if (consent !== state.consent) applyConsent(consent);
    } catch { /* The current tab still remembers the choice when storage is blocked. */ }
    return state.consent;
  }

  function applyConsent(consent) {
    state.consent = consent;
    browser[`ga-disable-${measurementId}`] = consent !== 'granted';
    if (state.initialized && browser.gtag) {
      browser.gtag('consent', 'update', {
        analytics_storage: consent === 'granted' ? 'granted' : 'denied',
        ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      });
    }
    if (consent !== 'granted') {
      state.lastPathname = null;
      state.lastLocation = null;
    }
  }

  function setConsent(consent) {
    if (!available || !['granted', 'denied'].includes(consent)) return;
    applyConsent(consent);
    try { browser.localStorage.setItem(consentKey, consent); } catch { /* session only */ }
    browser.dispatchEvent(new browser.CustomEvent('app:analytics-consent', {
      detail: { measurementId, consent },
    }));
  }

  function safeReferrer() {
    try {
      const url = new URL(browser.document.referrer);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.origin === origin
        ? `${origin}${sanitizePathname(url.pathname, routeTemplates)}`
        : url.origin;
    } catch { return ''; }
  }

  function initialize(page) {
    if (state.initialized) return;
    browser.dataLayer ||= [];
    browser.gtag ||= function () { browser.dataLayer.push(arguments); };
    browser.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    browser.gtag('js', new Date());
    browser.gtag('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    browser.gtag('set', page);
    // The router owns all page_view events, including the initial view.
    browser.gtag('config', measurementId, {
      send_page_view: false,
      allow_google_signals: false, allow_ad_personalization_signals: false,
    });
    const scriptId = `app-analytics-tag-${measurementId}`;
    if (!browser.document.getElementById(scriptId)) {
      const script = browser.document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.referrerPolicy = 'origin';
      browser.document.head.appendChild(script);
    }
    state.initialized = true;
  }

  function trackPageView(pathname) {
    if (!available || !pathname || getConsent() !== 'granted') return;
    const rawPathname = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    if (state.lastPathname === rawPathname) return;
    const page = {
      page_location: `${origin}${sanitizePathname(rawPathname, routeTemplates)}`,
      page_title: appTitle,
      page_referrer: state.lastLocation || safeReferrer(),
    };
    browser[`ga-disable-${measurementId}`] = false;
    initialize(page);
    browser.gtag('set', page);
    browser.gtag('event', 'page_view', { ...page, send_to: measurementId });
    state.lastPathname = rawPathname;
    state.lastLocation = page.page_location;
  }

  function subscribe(callback) {
    const onChange = (event) => {
      if (event.detail?.measurementId !== measurementId) return;
      const consent = event.detail.consent;
      if (!['granted', 'denied'].includes(consent)) return;
      applyConsent(consent);
      callback(consent);
    };
    const onStorage = (event) => {
      if (event.key !== consentKey && event.key !== null) return;
      const consent = event.newValue === 'granted' || event.newValue === 'denied'
        ? event.newValue : null;
      applyConsent(consent);
      callback(consent);
    };
    browser.addEventListener('app:analytics-consent', onChange);
    browser.addEventListener('storage', onStorage);
    return () => {
      browser.removeEventListener('app:analytics-consent', onChange);
      browser.removeEventListener('storage', onStorage);
    };
  }

  return { available, consentKey, getConsent, setConsent, trackPageView, subscribe };
}
