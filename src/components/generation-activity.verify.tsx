import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EN } from '../i18n/dict/en';

const component = await readFile(new URL('./GenerationActivity.tsx', import.meta.url), 'utf8');
const topBarButton = await readFile(new URL('./TopBarIconButton.tsx', import.meta.url), 'utf8');

assert.match(
  component,
  /<TopBarIconButton[\s\S]*?icon="sparkles"[\s\S]*?label=\{t\('Generation Tasks'\)\}/,
  'generation tasks button',
);
assert.doesNotMatch(
  component,
  /title=\{t\('Generation Tasks'\)\}/,
  'button uses label not title',
);
assert.match(topBarButton, /className="cc-tip cc-tip-r"/, 'button tooltip');
assert.match(topBarButton, /data-tip=\{label\}/, 'buttonlocallabel tooltip');
assert.match(topBarButton, /onMouseEnter=/, 'buttonshould provide hover');
assert.match(topBarButton, /onMouseLeave=/, 'button hover backrecoverstyle');
assert.equal(component.match(/retryClassLabel\(job\.retryClass, t\)/g)?.length, 1, 'retrylabel');

const generationActivityKeys = [
  'Generation Tasks',
  'Loading tasks…',
  'No generation tasks',
  'Legacy parameter summary (cannot be safely rerun)',
  'Parameter snapshot unavailable',
  'Legacy Task Status Unknown',
  'Just now',
  'Not Found',
  'Provider task',
  'Open Result',
  'Retry Recoverable Tasks',
  'Check Progress',
  'Pending',
  'Running',
  'Completed',
  'Failed',
  'Not Retryable',
  'Download Retry Available',
  'Retry',
  'Recoverable After Restart',
  'Generation Retry Available',
  'Resume Tasks',
  'Resuming…',
  'Keep checking, downloading, or rerunning tasks after a refresh',
  'Close',
] as const;

for (const key of generationActivityKeys) {
  assert.notEqual(EN[key], undefined, `should contain “${key}”`);
}

assert.match(component, /t\('\{n\} min ago'/, 'i18n min-ago format');
assert.match(component, /t\('\{n\} hr ago'/, 'i18n hr-ago format');

console.log('generation activity hover and localization verified');
