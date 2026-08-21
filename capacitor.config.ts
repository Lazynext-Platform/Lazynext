import type { CapacitorConfig } from '@capacitor/cli';

// Production hardening: set LAZYNEXT_MOBILE_HTTPS=1 when the app connects to an
// HTTPS-fronted server to disable cleartext HTTP and enforce secure transport.
const ENFORCE_HTTPS = process.env.LAZYNEXT_MOBILE_HTTPS === '1';

const config: CapacitorConfig = {
  appId: 'com.lazynext.app',
  appName: 'Lazynext',
  webDir: 'mobile/web',
  backgroundColor: '#0b0b0c',
  android: {
    // Allow HTTP to LAN/desktop servers in dev; disabled when ENFORCE_HTTPS.
    allowMixedContent: !ENFORCE_HTTPS,
    captureInput: true,
  },
  ios: {
    // ATS exceptions are in Info.plist; remove them for HTTPS production builds.
    contentInset: 'always',
  },
  server: {
    // Cleartext HTTP for LAN dev; disabled for HTTPS production builds.
    cleartext: !ENFORCE_HTTPS,
  },
};

export default config;
