#!/usr/bin/env bash
# Switch the mobile app to HTTPS-only production mode.
# Run this before building for production with an HTTPS-fronted server.
# Re-run with --dev to restore LAN cleartext HTTP for development.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:---prod}"

if [[ "$MODE" == "--dev" ]]; then
  echo "[mobile-https] Restoring LAN cleartext HTTP (dev mode)"
  # Capacitor config
  sed -i.bak 's/LAZYNEXT_MOBILE_HTTPS=1/LAZYNEXT_MOBILE_HTTPS=0/' capacitor.config.ts 2>/dev/null || true
  rm -f capacitor.config.ts.bak
  # iOS: restore NSAllowsArbitraryLoads
  /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool true" ios/App/App/Info.plist 2>/dev/null || true
  # Android: restore cleartext
  sed -i.bak 's/android:usesCleartextTraffic="false"/android:usesCleartextTraffic="true"/' android/app/src/main/AndroidManifest.xml 2>/dev/null || true
  rm -f android/app/src/main/AndroidManifest.xml.bak
  echo "[mobile-https] Dev mode restored. Run: npm run mobile:sync"
  exit 0
fi

echo "[mobile-https] Enabling HTTPS-only production mode"
# Capacitor config: enforce HTTPS
export LAZYNEXT_MOBILE_HTTPS=1

# iOS: remove NSAllowsArbitraryLoads (keep NSAllowsLocalNetworking for .local)
/usr/libexec/PlistBuddy -c "Delete :NSAppTransportSecurity:NSAllowsArbitraryLoads" ios/App/App/Info.plist 2>/dev/null || echo "(NSAllowsArbitraryLoads already absent)"

# Android: disable cleartext traffic
sed -i.bak 's/android:usesCleartextTraffic="true"/android:usesCleartextTraffic="false"/' android/app/src/main/AndroidManifest.xml
rm -f android/app/src/main/AndroidManifest.xml.bak

# Android: tighten network security config to deny cleartext
cat > android/app/src/main/res/xml/network_security_config.xml << 'XML'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <!-- Allow cleartext only for local development hosts -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.0.0/8</domain>
        <domain includeSubdomains="true">192.168.0.0/16</domain>
        <domain includeSubdomains="true">172.16.0.0/12</domain>
    </domain-config>
</network-security-config>
XML

echo "[mobile-https] Production HTTPS mode enabled."
echo "[mobile-https] Next steps:"
echo "  1. Set LAZYNEXT_MOBILE_HTTPS=1 in your environment"
echo "  2. Point the app at an HTTPS server URL"
echo "  3. Run: npm run mobile:sync"
echo "  4. Build: npm run mobile:open:ios (or android)"
echo ""
echo "[mobile-https] To restore dev mode later: bash scripts/mobile-production-https.sh --dev"
