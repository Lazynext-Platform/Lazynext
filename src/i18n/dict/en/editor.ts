// EN dictionary (field fragmentation, key = Chinese original text). Data files are exempt from the upper limit of row count.
// Source: src/editor/types.ts UI label of top-level constant (the constant body remains in Chinese, and the usage package is t(label)).
// The dynamic label v1 of undo historical/project data stored in reduce/store does not enter i18n (see the scanning rules).
export default {
  // ZOOM_SHAPE_LABELS
  'Punch': 'Punch',
  'Push & Pull Back': 'Push & Pull Back',
  'Slow Push': 'Slow Push',
  'Instant': 'Instant',
  'Zoom Out': 'Zoom Out',
  'Ease-In Push': 'Ease-In Push',
  'Bouncy Push': 'Bouncy Push',
  'Snap Push': 'Snap Push',
  'Pulse': 'Pulse',
  'Whip-In Push': 'Whip-In Push',
  // TRANSITION_LABELS
  'Anticipation Zoom': 'Anticipation Zoom',
  'Clean Line Wipe': 'Clean Line Wipe',
  'Cross Dissolve': 'Cross Dissolve',
  'Dip to Black': 'Dip to Black',
  'Flash': 'Flash',
  'Impact Shake': 'Impact Shake',
  'Luma Blend': 'Luma Blend',
  'Organic Dissolve': 'Organic Dissolve',
  'Page Curl': 'Page Curl',
  'Rack Focus': 'Rack Focus',
  'Soft Wipe': 'Soft Wipe',
  'Whip Pan': 'Whip Pan',
  'Circle Wipe': 'Circle Wipe',
  'Voice isolation failed; no clips were modified.': 'Voice isolation failed; no clips were modified.',
  'Loudness analysis failed; no clips were modified.': 'Loudness analysis failed; no clips were modified.',
  'Source media changed; the previous voice separation result was discarded. Retry.': 'Source media changed; the previous voice separation result was discarded. Retry.',
} as Record<string, string>;
