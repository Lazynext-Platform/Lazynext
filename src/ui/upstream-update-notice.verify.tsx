import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { DesktopWindowControlButtons } from '../components/DesktopWindowControls';

const moduleUrl = new URL('./UpstreamUpdateNoticeView.tsx', import.meta.url);
const noticeModule = await import(moduleUrl.href).catch(() => null);

assert.ok(noticeModule, 'should providetopversion');

const { UpstreamUpdateNoticeView } = noticeModule;
const markup = renderToStaticMarkup(
 <div data-dashboard-chrome>
 <UpstreamUpdateNoticeView
 message="Lazynext newversion V0.2.0currentversion V0.1.9download"
 actionLabel="downloadupdate"
 closeLabel="close"
 onAction={() => undefined}
 onDismiss={() => undefined}
 />
 <DesktopWindowControlButtons
 translate={(text) => text}
 onAction={() => undefined}
 />
 </div>,
);

assert.match(markup, /Lazynext.*V0\.2\.0/, 'newmustversion');
assert.match(markup, /><\/button>/, 'desktopnewmustdownload');
assert.match(markup, /role="status"/, 'state');
assert.doesNotMatch(markup, /<a\b/, 'updatemustdesktop IPC link');
assert.match(markup, /top:50%/, 'updateverticalcentered');
assert.match(markup, /left:50%/, 'updatehorizontalcentered');
assert.match(markup, /z-index:190/, 'updatemustsettingsbottomsettings');
assert.match(markup, /transform:translate\(-50%,\s*-50%\)/, 'updatecenterwindowcenter');
assert.match(markup, /aria-label="Window controls"/, 'desktopwindowmustupdate dashboard chrome centerrender');
assert.equal((markup.match(/class="cc-window-control /g) ?? []).length, 3, 'macOS titlewindowbutton');


console.log('upstream-update-notice.verify: dashboard-only centered upstream update notice OK');
