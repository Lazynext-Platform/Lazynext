import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EN } from '../i18n/dict/en';

const component = await readFile(new URL('./GenerationActivity.tsx', import.meta.url), 'utf8');
const topBarButton = await readFile(new URL('./TopBarIconButton.tsx', import.meta.url), 'utf8');

assert.match(
  component,
  /<TopBarIconButton[\s\S]*?icon="sparkles"[\s\S]*?label=\{t\(''\)\}/,
  'buttonbutton',
);
assert.doesNotMatch(
  component,
  /title=\{t\(''\)\}/,
  'buttonstyle title',
);
assert.match(topBarButton, /className="cc-tip cc-tip-r"/, 'button tooltip');
assert.match(topBarButton, /data-tip=\{label\}/, 'buttonlocallabel tooltip');
assert.match(topBarButton, /onMouseEnter=/, 'buttonshould provide hover');
assert.match(topBarButton, /onMouseLeave=/, 'button hover backrecoverstyle');
assert.equal(component.match(/retryClassLabel\(job\.retryClass, t\)/g)?.length, 1, 'retrylabel');

const generationActivityKeys = [
  '',
  'oldparam（all）',
  'paramsnapshot',
  'newbackcheck、download',
  'recovercenter…',
  '',
  '…',
  'none',
  'Provider',
  'openresult',
  'retryrecover',
  'check',
  'center',
  'in progress',
  'completed',
  'fail',
  '',
  'retrydownload',
  'retry',
  'backrecover',
  'retry',
  'oldstate',
] as const;

for (const key of generationActivityKeys) {
  assert.notEqual(EN[key], undefined, `should contain“${key}”`);
}

assert.match(component, /t\('\{n\} front'/, 'i18n format');
assert.match(component, /t\('\{n\} smallfront'/, 'small i18n format');
assert.match(component, /t\('\{n\} front'/, 'i18n format');

console.log('generation activity hover and localization verified');
