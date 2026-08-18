/**
 * Local bundled font registration (no bundled fonts — all fonts load via Google Fonts CDN).
 *
 * The LOCAL_CJK_FONTS array is empty: bundled CJK font files and their OFL license files
 * were removed. CJK fonts (Noto Serif SC, Noto Serif TC, ZCOOL QingKe HuangYou, etc.) remain
 * available via the Google Fonts CDN catalog. The registration/load functions are kept as
 * no-ops so downstream callers (googleFonts.ts, font-tools, verify scripts) continue to work.
 */

/** Normalized matching key (case/whitespace/punctuation insensitive). */
export function normalizeFontKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s_\-·.,'"`]+/g, '');
}

export interface LocalCjkFont {
  /** CSS font-family canonical name (MG/caption fontFamily uses this). */
  family: string;
  /** importName, also serves as a searchable alias. */
  importName: string;
  /** Font name aliases (legacy CJK aliases kept for project compatibility). */
  aliasZh: string[];
  /** weight → same-origin URL (/fonts/… ← assets/fonts product static). */
  files?: Record<number, string>;
  /** Same-origin stylesheet for unicode-range variable-font shards. */
  stylesheet?: string;
  /** Inclusive CSS variable-font weight range. */
  weightRange?: readonly [number, number];
}

// No bundled fonts — all fonts load via Google Fonts CDN.
export const LOCAL_CJK_FONTS: readonly LocalCjkFont[] = [];

/** family / importName / alias → entry (normalized matching). */
export function findLocalFont(name: string): LocalCjkFont | undefined {
  const key = normalizeFontKey(name);
  if (!key) return undefined;
  return LOCAL_CJK_FONTS.find(
    (f) =>
      normalizeFontKey(f.family) === key ||
      normalizeFontKey(f.importName) === key ||
      f.aliasZh.some((a) => normalizeFontKey(a) === key),
  );
}

const hasDom = (): boolean => typeof FontFace !== 'undefined' && typeof document !== 'undefined';

// family → FontFace instance registered in document.fonts (single instance, preventing repeated registration).
const registeredFaces = new Map<string, FontFace[]>();

function facesOf(font: LocalCjkFont): FontFace[] {
  let faces = registeredFaces.get(font.family);
  if (!faces) {
    faces = Object.entries(font.files ?? {}).map(
      ([weight, url]) =>
        new FontFace(font.family, `url(${url}) format('woff2')`, {
          weight,
          style: 'normal',
          display: 'swap',
        }),
    );
    for (const face of faces) document.fonts.add(face);
    registeredFaces.set(font.family, faces);
  }
  return faces;
}

const stylesheetPromises = new Map<string, Promise<void>>();

function registerStylesheet(font: LocalCjkFont): Promise<void> {
  if (!font.stylesheet) return Promise.resolve();
  const cached = stylesheetPromises.get(font.family);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.stylesheet!;
    link.dataset.localFontFamily = font.family;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => {
      link.remove();
      reject(new Error(`font stylesheet failed: ${font.family}`));
    }, { once: true });
    document.head.append(link);
  });
  stylesheetPromises.set(font.family, promise);
  void promise.catch(() => { stylesheetPromises.delete(font.family); });
  return promise;
}

async function loadFaces(font: LocalCjkFont): Promise<void> {
  if (!font.stylesheet) {
    await Promise.all(facesOf(font).map((face) => face.load()));
    return;
  }
  await registerStylesheet(font);
  const faces: FontFace[] = [];
  document.fonts.forEach((face) => {
    if (face.family === font.family) faces.push(face);
  });
  if (faces.length === 0) throw new Error(`font stylesheet registered no faces: ${font.family}`);
  await Promise.all(faces.map((face) => face.load()));
}

/**
 * Register all local fonts (unloaded FontFace, the browser pulls bytes on demand). Idempotent.
 * Called by googleFonts.loadProjectFonts() → The preview and headless rendering take effect in the same path.
 */
export function registerLocalFonts(): void {
  if (!hasDom()) return;
  for (const font of LOCAL_CJK_FONTS) {
    if (font.stylesheet) void registerStylesheet(font).catch(() => undefined);
    else facesOf(font);
  }
}

// family → Explicit loading in progress/completed (Promise cache, idempotent).
const loadPromises = new Map<string, Promise<void>>();

/**
 * Explicitly load a local font (accept family/importName/Chinese alias).
 * Resolve after loading all weights; non-local fonts or no DOM environment resolve directly.
 * Failures are removed from the cache for retry and thrown to the caller.
 */
export function ensureLocalFont(family: string): Promise<void> {
  const font = findLocalFont(family);
  if (!font) return Promise.resolve();
  const cached = loadPromises.get(font.family);
  if (cached) return cached;
  const promise = hasDom()
    ? loadFaces(font).catch((err: unknown) => {
        loadPromises.delete(font.family);
        throw err instanceof Error ? err : new Error(`font load failed: ${font.family}`);
      })
    : Promise.resolve();
  loadPromises.set(font.family, promise);
  return promise;
}
