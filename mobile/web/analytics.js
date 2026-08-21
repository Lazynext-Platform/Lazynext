// Opt-in analytics for the Lazynext mobile companion app.
// Uses PostHog's browser SDK (loaded from CDN) when a project API key is
// configured via LAZYNEXT_ANALYTICS_KEY in the server env or the app settings.
// No data is sent when the key is absent — the module is a no-op.
// Privacy: analytics is opt-in, disabled by default, and sends no media content
// or project data — only anonymous usage events (screen view, action, error).

const POSTHOG_URL = 'https://us.i.posthog.com';
let posthog = null;
let enabled = false;
let distinctId = 'anonymous';

export function initAnalytics(key) {
  if (!key || enabled) return;
  enabled = true;
  // Load PostHog script
  const script = document.createElement('script');
  script.src = `${POSTHOG_URL}/array/array.js`;
  script.async = true;
  script.onload = () => {
    posthog = window.posthog;
    if (posthog) {
      posthog.init(key, {
        api_host: POSTHOG_URL,
        autocapture: false,        // no automatic DOM capture — explicit events only
        disable_session_recording: true,
        opt_out_capturing_by_default: true,
        loaded: (ph) => { distinctId = ph.get_distinct_id(); },
      });
      track('app_opened');
    }
  };
  document.head.appendChild(script);
}

export function track(event, properties = {}) {
  if (!posthog || !enabled) return;
  try { posthog.capture(event, properties); } catch { /* no-op */ }
}

export function trackScreen(screenName) {
  track('screen_viewed', { screen: screenName });
}

export function trackAction(action, properties = {}) {
  track('action', { action, ...properties });
}

export function trackError(message) {
  track('error', { message: String(message).slice(0, 200) });
}

export function analyticsEnabled() {
  return enabled;
}

export function getDistinctId() {
  return distinctId;
}
