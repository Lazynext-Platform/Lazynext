import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lazynext.app',
  appName: 'Lazynext',
  webDir: 'mobile/web',
  backgroundColor: '#0b0b0c',
  android: {
    // Allow HTTP to LAN/desktop servers (the editor runs on http://<lan-ip>:5199).
    allowMixedContent: true,
    captureInput: true,
  },
  ios: {
    // Allow HTTP loads to LAN/desktop servers via ATS exception (Info.plist).
    contentInset: 'always',
  },
  server: {
    // The companion app is bundled; it connects to a user-configured server at runtime.
    cleartext: true,
  },
};

export default config;
