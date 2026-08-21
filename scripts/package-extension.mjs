#!/usr/bin/env node
// Package the Lazynext browser extension for store submission.
// Produces:
//   dist/extension/lazynext-chrome.zip   — Chrome Web Store / Edge Add-ons
//   dist/extension/lazynext-firefox.zip  — Firefox AMO
//   dist/extension/lazynext-safari/      — Safari Web Extension source (for xcrun)
// Usage: node scripts/package-extension.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const extDir = resolve(root, 'extension');
const outDir = resolve(root, 'dist/extension');
const safariDir = resolve(outDir, 'lazynext-safari');

// Clean + create output
execSync(`rm -rf "${outDir}"`, { stdio: 'inherit' });
mkdirSync(outDir, { recursive: true });

// ── Chrome / Edge ──
// Chrome uses Manifest V3 as-is. The manifest.json is already Chrome-compatible.
const chromeZip = resolve(outDir, 'lazynext-chrome.zip');
console.log('[ext] Packaging Chrome/Edge…');
execSync(`cd "${extDir}" && zip -r "${chromeZip}" . -x "*.DS_Store" -x "README.md"`, { stdio: 'inherit' });
console.log(`[ext] Chrome package: ${chromeZip}`);

// ── Firefox ──
// Firefox supports MV3 but needs browser_specific_settings in the manifest.
// Create a temp copy with the Firefox manifest additions.
const firefoxDir = resolve(outDir, 'lazynext-firefox');
mkdirSync(firefoxDir, { recursive: true });
execSync(`cp -R "${extDir}/"* "${firefoxDir}/"`, { stdio: 'inherit' });

// Patch manifest.json for Firefox
const manifestPath = resolve(firefoxDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.browser_specific_settings = {
  gecko: {
    id: 'lazynext@lazynext.com',
    strict_min_version: '115.0',
  },
};
// Firefox MV3 uses background.scripts instead of background.service_worker
if (manifest.background?.service_worker) {
  manifest.background = { scripts: [manifest.background.service_worker] };
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const firefoxZip = resolve(outDir, 'lazynext-firefox.zip');
console.log('[ext] Packaging Firefox…');
execSync(`cd "${firefoxDir}" && zip -r "${firefoxZip}" . -x "*.DS_Store" -x "README.md"`, { stdio: 'inherit' });
console.log(`[ext] Firefox package: ${firefoxZip}`);

// ── Safari ──
// Safari needs conversion via xcrun safari-web-extension-converter.
// We output the extension source; the user runs the converter to produce an Xcode project.
console.log('[ext] Preparing Safari extension source…');
mkdirSync(safariDir, { recursive: true });
execSync(`cp -R "${extDir}/"* "${safariDir}/"`, { stdio: 'inherit' });
console.log(`[ext] Safari source: ${safariDir}`);
console.log('[ext] To build Safari: xcrun safari-web-extension-converter "%s" -project-location "%s"', safariDir, outDir);

// ── Summary ──
console.log('\n[ext] Packaging complete:');
console.log('  Chrome/Edge: dist/extension/lazynext-chrome.zip');
console.log('  Firefox:     dist/extension/lazynext-firefox.zip');
console.log('  Safari src:  dist/extension/lazynext-safari/');
console.log('\n[ext] Submit to:');
console.log('  Chrome: https://chrome.google.com/webstore/devconsole');
console.log('  Edge:   https://partner.microsoft.com/dashboard/microsoftedge');
console.log('  Firefox: https://addons.mozilla.org/developers/');
console.log('  Safari:  xcrun safari-web-extension-converter (then Xcode + Apple Developer account)');
