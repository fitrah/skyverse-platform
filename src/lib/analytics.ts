export const GA_ID = "G-9FS82FZ5KE";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

export function trackEvent(name: string, params: Record<string, string | number | boolean> = {}) {
  if (typeof window !== "undefined" && localStorage.getItem("skyverse_analytics_consent") === "granted") {
    window.gtag?.("event", name, params);
  }
}
