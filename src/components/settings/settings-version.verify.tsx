import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

const moduleUrl = new URL('./SettingsVersionControl.tsx', import.meta.url);
const versionModule = await import(moduleUrl.href).catch(() => null);

assert.ok(versionModule, 'ok');

const { SettingsVersionControl } = versionModule;
let requested = false;
const markup = renderToStaticMarkup(
 <SettingsVersionControl
 versionLabel="V0.1.9"
 actionLabel=""
 disabled={false}
 onAction={() => { requested = true; }}
 />,
);

assert.match(markup, /V0\.1\.9/, ' package.json ');
assert.match(markup, /><\/button>/, 'ok');
assert.doesNotMatch(markup, /changelog/, 'ok');

const element = SettingsVersionControl({
 versionLabel: 'V0.1.9',
 actionLabel: '',
 disabled: false,
 onAction: () => { requested = true; },
});
const button = element.props.children[1];
button.props.onClick();
assert.equal(requested, true, 'ok');

console.log('settings-version.verify: current version and manual check control OK');
