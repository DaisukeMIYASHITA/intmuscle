# IntMuscle: browser analytics setup

## Status

- Code prepared: explicit allow/decline UI; tag only loads after allow; initial and Next.js path transitions emit `page_view`.
- Service configuration pending: this app needs its own GA4 property and Web data stream under `apps@entertainment.co.jp`. Never reuse another app's ID.
- This change alone does not confirm a successful build, a production deployment, or real GA4 event receipt.

## Production configuration

Set these in the hosting Production environment, then rebuild. `NEXT_PUBLIC_` values are public browser configuration: never put secrets here.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | The dedicated Web stream's verified `G-...` ID; leave blank until obtained |
| `NEXT_PUBLIC_GA_SITE_URL` | `https://intmuscle-rho.vercel.app`; exact HTTPS origin with no path, query or hash |
| `NEXT_PUBLIC_GA_ENABLED` | `true`; set `false` and rebuild to disable |

Production-origin evidence: GitHub repository homepage (2026-10-17); old intmuscle-tezu host is not used. Reachability and runtime deployment were not verified by this setup document. Verify the official deployment before changing domains.

The tag stays inert with missing/invalid configuration, a development build, Vercel Preview/Development, a different browser origin, or no explicit user consent. The Next config copies Vercel's non-secret deployment environment into the browser build. Localhost/loopback origins are blocked.

## Required GA4 stream settings

1. Turn **Enhanced measurement OFF** for this stream. In particular, do not collect browser-history page changes, site search, or form interactions automatically.
2. The runtime sets `send_page_view: false` and owns all initial/SPA `page_view` events. Do not add a second Google tag or GTM initialization for the same ID.
3. Google signals and ad personalization are disabled in the tag config. Ad storage, ad user data and ad personalization consent always remain denied. This change does not activate advertising or paid services.

Page metadata uses a fixed app title and allowlisted route templates. Dynamic identifiers/share tokens become `[id]`, `[slug]` or `[token]`; unknown routes become `/other`. Query strings, hashes, document titles containing input, email addresses, login identities and form contents are not attached to analytics events. Internal referrers use the same route templates; external referrers use origin only.

## Consent and privacy

The product UI uses plain アクセス解析 wording, with allow/decline and an always-reopenable settings control. No Google script is requested before allow. Decline/revocation stops future measurement; it does not delete previously sent data or existing cookies.

Consent is saved in `app.analytics.consent.<measurementId>` as `granted`/`denied`. If storage is blocked it lasts for the current tab only. A future existing CMP can integrate through `app:analytics-consent` with `detail: {measurementId, consent: "granted" | "denied"}`; unify the consent UI before adopting a separate CMP. The `/privacy` page describes this browser integration.

## Scope and validation

Implemented: initial/path-transition `page_view` and GA4 basic session/engagement measurement. Query/hash-only navigation does not send another page view.

Candidate primary events (not yet emitted): `select_training / start_training / cheer_sent`. Add fixed event names at confirmed successful actions, with only necessary aggregate values. Preserve existing analytics and native SDK ownership. Crash/error analysis, ad monetization and ad-attribution choices remain app-specific preflight decisions.

Run `node --test tests/browser-analytics.test.mjs` without installing dependencies. It checks disabled/unconfigured/dev/preview/wrong-host behavior, consent, initial/transition deduplication, dynamic-path/referrer sanitization, revocation and cross-tab changes.

Before release, run the application's typecheck/build and review the deployed UI. After deployment, explicitly exercise allow/decline and route transitions. Use Tag Assistant debug mode with GA4 DebugView/realtime to verify one initial `page_view`, one per path transition, the correct dedicated stream, and sanitized request parameters. Passing local tests is not evidence of real event receipt.

References: [Next.js usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname), [Next.js Script](https://nextjs.org/docs/app/api-reference/components/script), [GA4 pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views).
