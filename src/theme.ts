// Theme tokens. Since the skinning system (see skins.ts), all here are var(--ln-*)
// Indirect reference - the true value is in the SKINS registry of skins.ts (default skin "Graphite",
// Consistent with old hex value-wise). Inline styles are still written as theme.x, with zero modification and zero re-rendering when changing skins.
// ⚠ These values can only be used in DOM style/CSS:canvas fillStyle, SVG attribute bits, and hex string concatenation
// Can't parse var() (all positions have been audited to zero, new code sets a precedent).
export const theme = {
  bg: 'var(--ln-bg)', // editor void / timeline background
  inset: 'var(--ln-inset)', // Inner groove (input well)
  panel: 'var(--ln-panel)', // Base editor surface.
  panelAlt: 'var(--ln-panel-alt)', // --surface-raised (cards, chat bubbles, popovers, hover)
  hover: 'var(--ln-hover)', // Row hover / activate fill
  border: 'var(--ln-border)', // Panel separator.
  borderLight: 'var(--ln-border-light)',
  text: 'var(--ln-text)', // --foreground
  textMuted: 'var(--ln-text-muted)', // secondary text
  textDim: 'var(--ln-text-dim)', // Inactive text.
  textStrong: 'var(--ln-text-strong)', // Highlight text on hover
  accent: 'var(--ln-accent)', // measured export coral
  accentDeep: 'var(--ln-accent-deep)', // accent press / bottom of main button
  onAccent: 'var(--ln-on-accent)', // accent text on fill (pastel skin = dark text)
  gold: 'var(--ln-gold)', // --primary (amber highlight)
  select: 'var(--ln-select)',
  success: 'var(--ln-success)', // Tool success/completion status (same value and different synonyms as A2 rail chip, independent token)
  danger: 'var(--ln-danger)', // Errors, deletions and destructive operations
  // Timeline surfaces use subtly blue-tinted dark colors.
  tlTrack: 'var(--ln-tl-track)', // --tl-track-bg (lane behind clips)
  tlSidePanel: 'var(--ln-tl-side-panel)', // --tl-side-panel-bg (track-header column)
  // track-header chips
  trackVideo: 'var(--ln-track-video)', // V-track chip
  trackAudioA1: 'var(--ln-track-audio-a1)',
  trackAudioA2: 'var(--ln-track-audio-a2)',
  trackCaption: 'var(--ln-track-caption)',
  // Clip fills by kind: video=blue, audio=green, MG=pink, text=amber.
  clipVideo: 'var(--ln-clip-video)', // --tl-item-video
  clipAudio: 'var(--ln-clip-audio)', // --tl-item-audio
  clipMg: 'var(--ln-clip-mg)', // --tl-item-motion-graph
  clipText: 'var(--ln-clip-text)', // --tl-item-text
} as const;

const alpha = (channel: string, opacity: number): string =>
  `rgba(var(--ln-${channel}-rgb), ${opacity})`;

/** UI translucent color. The ink is inverted with the darker skin, and the shadow always expresses suspended levels.*/
export const themeAlpha = {
  ink: (opacity: number): string => alpha('ink', opacity),
  accent: (opacity: number): string => alpha('accent', opacity),
  shadow: (opacity: number): string => alpha('shadow', opacity),
} as const;
