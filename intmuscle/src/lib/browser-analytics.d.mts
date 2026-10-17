export type AnalyticsConsent = 'granted' | 'denied';
export type AnalyticsConfig = {
  measurementId: string; siteUrl: string; enabled: boolean; production: boolean;
  deploymentEnv: string; appTitle: string; routeTemplates: string[];
};
export function sanitizePathname(pathname: string, routeTemplates: string[]): string;
export function createAnalytics(config: AnalyticsConfig, browser: Window & typeof globalThis): {
  available: boolean; consentKey: string;
  getConsent(): AnalyticsConsent | null;
  setConsent(consent: AnalyticsConsent): void;
  trackPageView(pathname: string | null): void;
  subscribe(callback: (consent: AnalyticsConsent | null) => void): () => void;
};
