import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RAW_COLOR = /(?<![\w-])#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi;
const TOKENIZED_CHANNEL = 'var(--ln-';

const CONTENT_COLOR_SELECTORS = new Set([
  '.ln-export-qa-card img',
  '.ln-audio-waveform path',
  '.ln-clip-wave path',
  '.ln-clip-label',
  '.ln-clip-label.audio',
  '.ln-clip-badge',
  '.ln-clip-badge.fx',
  '.ln-clip-badge.lut',
  '.ln-clip-badge.zoom',
  '.ln-clip-badge.iso',
  '.ln-clip-badge.tr',
  '.ln-transition-marker',
  '.ln-transition-marker:hover',
  '.ln-capedit-colordot',
  // The functional status color must maintain the original semantics and not change color following the skin.
  '.ln-media-error',
  '.ln-asset-menu-portal button.danger',
  '.ln-asset-menu-portal button.danger:hover',
  '.ln-modal button.danger',
  '.ln-export-qa-card.issues,.ln-export-qa-card.error',
  '.ln-export-qa-card li.error',
  '.ln-export-progress.verifying .ln-export-progress-track i',
  '.ln-export-progress.failed .ln-export-progress-track i',
  '.ln-caption-style-error',
  '.ln-tx-error',
  '.ln-tx-section.drag-over',
  '.ln-tx-speech.drag-over',
  '.ln-tx-word.editable:hover',
  '.ln-tx-gap-del:hover',
  '.ln-cap-error',
  '.ln-insp-range',
  '.ln-audiofx-strength input',
  '.ln-audiofx-note.err',
  '.ln-capedit-btn.danger:hover',
]);

const CHROME_FILES = [
  'src/components/ExportHistory.tsx',
  'src/components/PreviewPanel.tsx',
  'src/components/VersionHistory.tsx',
  'src/components/chat/ChatComposer.tsx',
  'src/components/settings/DesignStylePanel.tsx',
  'src/components/settings/SettingsDialog.tsx',
  'src/components/settings/SkinPicker.tsx',
  'src/components/settings/settingsVendorPane.tsx',
  'src/components/timeline/ClipContextMenu.tsx',
  'src/components/timeline/MarkerEditor.tsx',
  'src/components/timeline/Timeline.tsx',
  'src/components/timeline/TimelineRuler.tsx',
  'src/components/timeline/TimelineSpeedControl.tsx',
  'src/components/timeline/TimelineTabs.tsx',
  'src/components/timeline/TrackLane.tsx',
  'src/library/TemplateBrowser.tsx',
  'src/media/MediaCleanupDialog.tsx',
  'src/shortcuts/ShortcutsDialog.tsx',
  'src/ui/AppToastHost.tsx',
] as const;

const CONTENT_COLORS_BY_FILE = new Map<string, ReadonlySet<string>>([
  ['src/components/settings/DesignStylePanel.tsx', new Set(['#000000'])],
  ['src/components/chat/ChatComposer.tsx', new Set(['#e5866a'])],
  ['src/components/settings/settingsVendorPane.tsx', new Set(['#f77'])],
  ['src/components/PreviewPanel.tsx', new Set([
    '#000', 'rgba(255,255,255,${opacity})', 'rgba(255,255,255,0.18)',
  ])],
  ['src/components/timeline/Timeline.tsx', new Set([
    '#4fd1ff', '#0006', 'rgba(88,166,255,0.14)', '#58a6ff',
    'rgba(120,170,255,0.95)', 'rgba(80,140,255,0.16)',
  ])],
  ['src/components/timeline/TimelineRuler.tsx', new Set([
    'rgba(88,166,255,0.18)', '#58a6ff', '#f0883e', 'rgba(0,0,0,0.9)',
  ])],
  ['src/components/timeline/TrackLane.tsx', new Set([
    '#6a9fd8', 'rgba(0,0,0,.4)', '#fff', 'rgba(255,255,255,.08)',
    '#6a9fd855', '#6a9fd844', '#ffd866', 'rgba(0,0,0,0.85)',
  ])],
  ['src/library/TemplateBrowser.tsx', new Set([
    'rgba(0,0,0,0.55)', '#f5c518', '#fff',
  ])],
]);

function normalizedColor(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function rawColors(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  return [...withoutComments.matchAll(RAW_COLOR)]
    .map(([literal]) => literal)
    .filter((literal) => !literal.includes(TOKENIZED_CHANNEL));
}

function lastSelectorLine(header: string): string {
  return header.trim().split('\n').at(-1)?.trim() ?? '';
}

const css = readFileSync('src/index.css', 'utf8');
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const colors = rawColors(match[2]);
  if (colors.length === 0) continue;
  const selector = lastSelectorLine(match[1]);
  assert.ok(
    CONTENT_COLOR_SELECTORS.has(selector),
    `${selector}: UI chrome must use --ln-* tokens (${colors.join(', ')})`,
  );
}

for (const file of CHROME_FILES) {
  const colors = rawColors(readFileSync(file, 'utf8'));
  const allowed = CONTENT_COLORS_BY_FILE.get(file) ?? new Set<string>();
  const normalizedAllowed = new Set([...allowed].map(normalizedColor));
  const unexpected = colors.filter((color) => !normalizedAllowed.has(normalizedColor(color)));
  assert.deepEqual(unexpected, [], `${file}: fixed colors found (${unexpected.join(', ')})`);
}

for (const selector of ['.ln-mic-group', '.ln-timeline-timecode', '.ln-ruler-head span', '.ln-track-name']) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  assert.ok(body.includes('var(--ln-'), `${selector}: missing a skin token`);
  assert.deepEqual(rawColors(body), [], `${selector}: fixed color found`);
}

process.stdout.write('theme-tokenization.verify: ok\n');
