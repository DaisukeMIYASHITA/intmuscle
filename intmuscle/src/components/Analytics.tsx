"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { createAnalytics, type AnalyticsConsent } from "@/lib/browser-analytics.mjs";

const config = {
  measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
  siteUrl: process.env.NEXT_PUBLIC_GA_SITE_URL || "",
  enabled: process.env.NEXT_PUBLIC_GA_ENABLED !== "false",
  production: process.env.NODE_ENV === "production",
  deploymentEnv: process.env.NEXT_PUBLIC_GA_DEPLOYMENT_ENV || "",
  appTitle: "IntMuscle",
  routeTemplates: ["/", "/muscle/Choose", "/muscle/Observe", "/muscle/Cheer", "/muscle/auth", "/muscle/verify", "/muscle/huddle", "/muscle/[id]", "/privacy"],
};

export function Analytics() {
  const router = useRouter();
  const pathname = router.isReady ? router.asPath : null;
  const analyticsRef = useRef<ReturnType<typeof createAnalytics> | null>(null);
  const [available, setAvailable] = useState(false);
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const analytics = createAnalytics(config, window);
    analyticsRef.current = analytics;
    if (!analytics.available) return;
    setAvailable(true);
    setConsent(analytics.getConsent());
    return analytics.subscribe(setConsent);
  }, []);

  useEffect(() => {
    analyticsRef.current?.trackPageView(pathname);
  }, [pathname, consent]);

  function choose(value: AnalyticsConsent) {
    analyticsRef.current?.setConsent(value);
    setConsent(value);
    setSettingsOpen(false);
  }

  if (!available) return null;
  const open = consent === null || settingsOpen;
  return (
    <aside aria-label="アクセス解析の設定" style={{ position: "fixed", bottom: 16, right: 16,
      left: open ? 16 : "auto", zIndex: 2147483000, maxWidth: open ? 560 : "none",
      marginLeft: "auto", padding: open ? 16 : 0, borderRadius: 12,
      background: open ? "#ffffff" : "transparent", color: "#111827",
      boxShadow: open ? "0 4px 24px #0003" : "none", fontSize: 14, lineHeight: 1.6 }}>
      {open ? <>
        <strong>アクセス解析</strong>
        <p style={{ margin: "8px 0" }}>サービス改善のため、Cookieを使って閲覧ページや利用状況を分析します。
          許可しなくても利用できます。<a href="/privacy" style={{ color: "#174ea6", textDecoration: "underline" }}>詳しく見る</a></p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => choose("granted")} style={{ padding: "8px 16px",
            background: "#174ea6", color: "#fff", border: "1px solid #174ea6", borderRadius: 6 }}>許可する</button>
          <button type="button" onClick={() => choose("denied")} style={{ padding: "8px 16px",
            background: "#fff", color: "#111827", border: "1px solid #64748b", borderRadius: 6 }}>許可しない</button>
        </div>
      </> : <button type="button" onClick={() => setSettingsOpen(true)} style={{ padding: "5px 10px",
        background: "#fff", color: "#334155", border: "1px solid #94a3b8", borderRadius: 6,
        fontSize: 12 }}>アクセス解析の設定</button>}
    </aside>
  );
}
