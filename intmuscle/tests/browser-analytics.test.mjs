import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalytics, sanitizePathname } from '../src/lib/browser-analytics.mjs';

const config = {
  measurementId: 'G-TEST123456', siteUrl: 'https://app.example.com',
  enabled: true, production: true, deploymentEnv: 'production',
  appTitle: 'Fixed app title', routeTemplates: ['/', '/events', '/events/[slug]', '/privacy'],
};

function browser() {
  const events = new EventTarget();
  const storage = new Map();
  const scripts = [];
  return {
    location: { origin: config.siteUrl },
    localStorage: { getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key), clear: () => storage.clear() },
    document: {
      title: 'private@example.com search text',
      referrer: 'https://search.example.com/results?q=private@example.com#secret',
      createElement: () => ({}),
      getElementById: (id) => scripts.find((script) => script.id === id),
      head: { appendChild: (script) => scripts.push(script) },
    },
    CustomEvent,
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
    dispatchEvent: (...args) => events.dispatchEvent(...args),
    scripts,
  };
}

function commands(target, name) {
  return (target.dataLayer || []).map((args) => Array.from(args)).filter((args) => args[0] === name);
}
function views(target) { return commands(target, 'event').filter((args) => args[1] === 'page_view'); }

test('requires dedicated valid configuration, a production build and the exact production origin', () => {
  for (const change of [
    { measurementId: '' }, { measurementId: 'invalid' }, { siteUrl: '' },
    { siteUrl: 'http://app.example.com' }, { siteUrl: 'https://app.example.com/path' },
    { siteUrl: 'https://app.example.com/?token=secret' }, { siteUrl: 'https://another.example.com' },
    { production: false }, { deploymentEnv: 'preview' }, { deploymentEnv: 'development' }, { enabled: false },
  ]) {
    const target = browser();
    const analytics = createAnalytics({ ...config, ...change }, target);
    assert.equal(analytics.available, false, JSON.stringify(change));
    analytics.setConsent('granted');
    analytics.trackPageView('/');
    assert.equal(target.scripts.length, 0);
    assert.equal(target.dataLayer, undefined);
  }
});

test('does not load or queue the tag before an explicit grant, including decline', () => {
  const target = browser();
  const analytics = createAnalytics(config, target);
  analytics.trackPageView('/');
  analytics.setConsent('denied');
  analytics.trackPageView('/');
  assert.equal(target.scripts.length, 0);
  assert.equal(target.dataLayer, undefined);
});

test('one initial page_view, one per SPA path transition, and one initialization across remounts', () => {
  const target = browser();
  const analytics = createAnalytics(config, target);
  analytics.setConsent('granted');
  analytics.trackPageView('/');
  createAnalytics(config, target).trackPageView('/'); // StrictMode/remount
  analytics.trackPageView('/?q=private@example.com#secret'); // no duplicate for URL-only filters
  analytics.trackPageView('/events');
  analytics.trackPageView('/events/secret-first-id?email=private@example.com');
  analytics.trackPageView('/events/secret-second-id');
  analytics.trackPageView('/'); // returning to a page is a new view
  assert.equal(target.scripts.length, 1);
  assert.equal(commands(target, 'config').length, 1);
  assert.equal(commands(target, 'config')[0][2].send_page_view, false);
  assert.equal(views(target).length, 5);
  assert.equal(views(target)[2][2].page_location, 'https://app.example.com/events/[slug]');
  assert.equal(views(target)[2][2].page_referrer, 'https://app.example.com/events');
  assert.equal(views(target)[0][2].page_referrer, 'https://search.example.com');
  const serialized = JSON.stringify(target.dataLayer);
  for (const excluded of ['private@example.com', 'secret-first-id', 'secret-second-id', '#secret', '?q=']) {
    assert.equal(serialized.includes(excluded), false, excluded);
  }
  assert.ok(views(target).every((view) => view[2].page_title === 'Fixed app title'));
});

test('grant can be withdrawn and restored without a second loader or config', () => {
  const target = browser();
  const analytics = createAnalytics(config, target);
  analytics.setConsent('granted');
  analytics.trackPageView('/');
  analytics.setConsent('denied');
  analytics.trackPageView('/events');
  assert.equal(target[`ga-disable-${config.measurementId}`], true);
  assert.equal(views(target).length, 1);
  analytics.setConsent('granted');
  analytics.trackPageView('/events');
  assert.equal(target[`ga-disable-${config.measurementId}`], false);
  assert.equal(views(target).length, 2);
  assert.equal(target.scripts.length, 1);
  assert.equal(commands(target, 'config').length, 1);
  assert.ok(commands(target, 'consent').every((command) => command[2].ad_storage === 'denied'));
});

test('choices are synchronized across components and tabs; subscriptions clean up', () => {
  const target = browser();
  const analytics = createAnalytics(config, target);
  const received = [];
  const unsubscribe = analytics.subscribe((value) => received.push(value));
  analytics.setConsent('granted');
  assert.deepEqual(received, ['granted']);
  const storageEvent = new Event('storage');
  Object.assign(storageEvent, { key: analytics.consentKey, newValue: 'denied' });
  target.localStorage.setItem(analytics.consentKey, 'denied');
  target.dispatchEvent(storageEvent);
  analytics.trackPageView('/');
  assert.deepEqual(received, ['granted', 'denied']);
  assert.equal(target.dataLayer, undefined);
  unsubscribe();
  analytics.setConsent('granted');
  assert.deepEqual(received, ['granted', 'denied']);
});

test('route allowlist strips all dynamic identifiers and unknown paths', () => {
  assert.equal(sanitizePathname('/events/secret-id?email=person#fragment', config.routeTemplates), '/events/[slug]');
  assert.equal(sanitizePathname('/unknown/private@example.com', config.routeTemplates), '/other');
  assert.equal(sanitizePathname('/privacy/', config.routeTemplates), '/privacy');
});


test('removing or corrupting saved consent revokes an earlier grant on the next read', () => {
  for (const change of ['remove', 'invalid']) {
    const target = browser();
    const analytics = createAnalytics(config, target);
    analytics.setConsent('granted');
    analytics.trackPageView('/');
    if (change === 'remove') target.localStorage.removeItem(analytics.consentKey);
    else target.localStorage.setItem(analytics.consentKey, 'invalid');
    analytics.trackPageView('/events');
    assert.equal(analytics.getConsent(), null);
    assert.equal(target[`ga-disable-${config.measurementId}`], true);
    assert.equal(views(target).length, 1);
  }
});

test('cross-tab removeItem and clear both revoke consent and reopen the choice UI', () => {
  for (const key of ['app.analytics.consent.G-TEST123456', null]) {
    const target = browser();
    const analytics = createAnalytics(config, target);
    const received = [];
    analytics.subscribe((value) => received.push(value));
    analytics.setConsent('granted');
    analytics.trackPageView('/');
    target.localStorage.clear();
    const event = new Event('storage');
    Object.assign(event, { key, newValue: null });
    target.dispatchEvent(event);
    assert.deepEqual(received, ['granted', null]);
    assert.equal(target[`ga-disable-${config.measurementId}`], true);
    analytics.trackPageView('/events');
    assert.equal(views(target).length, 1);
  }
});

test('only thrown storage access retains explicit current-tab consent', () => {
  const target = browser();
  target.localStorage.getItem = () => { throw new Error('storage blocked'); };
  target.localStorage.setItem = () => { throw new Error('storage blocked'); };
  const analytics = createAnalytics(config, target);
  assert.equal(analytics.getConsent(), null);
  analytics.setConsent('granted');
  analytics.trackPageView('/');
  assert.equal(analytics.getConsent(), 'granted');
  assert.equal(views(target).length, 1);
  analytics.setConsent('denied');
  analytics.trackPageView('/events');
  assert.equal(views(target).length, 1);
});
