import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PlayerRef } from '@remotion/player';
import type { RefObject } from 'react';
import type { TimelineItem, TimelineState } from '../../editor/types';
import { PreviewTransformOverlay } from './PreviewTransformOverlay';
import { fitPreviewCanvasSize } from './previewCanvasGeometry';

const item: TimelineItem = {
  id: 'card',
  track: 'V2',
  startFrame: 0,
  durationInFrames: 90,
  kind: 'motion-graphic',
  name: '',
  width: 1080,
  height: 1920,
  transform: { x: 5, y: -4, scale: 0.8, rotation: 8 },
};

const stateOf = (trackPatch: Record<string, unknown> = {}, selectedId: string | null = 'card'): TimelineState => ({
  fps: 30,
  width: 1080,
  height: 1920,
  fit: 'contain',
  selectedId,
  selectedIds: selectedId ? [selectedId] : [],
  trackOrder: ['V2'],
  tracks: { V2: { kind: 'video', ...trackPatch } },
  items: [item],
});

const playerRef = {
  current: { getCurrentFrame: () => 20, pause: () => undefined } as unknown as PlayerRef,
} as RefObject<PlayerRef | null>;

const props = {
  playerRef,
  onSelectItem: () => undefined,
  onSetItemTransform: () => undefined,
  onSetItemKeyframe: () => undefined,
  onBeginHistoryGesture: () => undefined,
  onEndHistoryGesture: () => undefined,
};

// The canvas wrapper itself must be the contained composition rect. All
// interactive overlays are inset:0 children of this wrapper, so keeping its
// aspect is what makes caption hit boxes and clip handles share one coordinate
// space after an aspect switch.
assert.deepEqual(
  fitPreviewCanvasSize(
    { width: 558, height: 770 },
    { width: 1920, height: 1080 },
  ),
  { width: 558, height: 313.875 },
  '16:9 highpreviewcenterwide contain，must notoldhigh',
);
assert.deepEqual(
  fitPreviewCanvasSize(
    { width: 558, height: 770 },
    { width: 1080, height: 1080 },
  ),
  { width: 558, height: 558 },
  '1:1 squarecenteredit',
);
assert.deepEqual(
  fitPreviewCanvasSize(
    { width: 900, height: 500 },
    { width: 1080, height: 1920 },
  ),
  { width: 281.25, height: 500 },
  '9:16 widepreviewcenterhigh contain',
);
const previewPanelSource = readFileSync(new URL('../PreviewPanel.tsx', import.meta.url), 'utf8');
assert.match(
  previewPanelSource,
  /fitPreviewCanvasSize\(stageSize,\s*\{\s*width:\s*state\.width,\s*height:\s*state\.height/s,
  'previewpanelmust contain backplay、captioncenterclip',
);

// A selected editable clip exposes one compact transform frame and nine handles.
{
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={stateOf()} {...props} />);
  assert.match(markup, /aria-label="previewclip"/);
  assert.match(markup, /data-preview-selection="card"/);
  assert.equal((markup.match(/data-preview-handle="scale-[0-3]"/g) ?? []).length, 4, 'scale');
  assert.equal((markup.match(/data-preview-handle="crop-[nsew]"/g) ?? []).length, 4, 'centerdot');
  assert.equal((markup.match(/data-preview-handle="rotate"/g) ?? []).length, 1, 'rotate');
  assert.match(markup, /var\(--cc-accent\)/, 'colorcurrentcolor grading');
}

// Locked and hidden tracks can never expose writable controls.
for (const trackPatch of [{ locked: true }, { hidden: true }]) {
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={stateOf(trackPatch)} {...props} />);
  assert.doesNotMatch(markup, /data-preview-selection=/);
  assert.doesNotMatch(markup, /data-preview-handle=/);
}

// A timeline selection outside the current frame must not leave a stale box.
{
  const state = stateOf();
  state.items = [{ ...item, startFrame: 30 }];
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={state} {...props} />);
  assert.doesNotMatch(markup, /data-preview-selection=/);
}

// Window resize can briefly report a zero-size composition; controls stay hidden until geometry is valid.
{
  const state = stateOf();
  state.width = 0;
  state.height = 0;
  const markup = renderToStaticMarkup(<PreviewTransformOverlay state={state} {...props} />);
  assert.doesNotMatch(markup, /data-preview-selection=/);
  assert.doesNotMatch(markup, /data-preview-handle=/);
}

console.log('preview-transform-overlay.verify: ok (////rotate/lockhidden/framerange)');
