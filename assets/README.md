# Product assets (built-in static resources)

Static files shipped with the product and released alongside each version. These are **not** user-uploaded or AI-generated project media.

| Directory / File | URL prefix | Purpose |
|---|---|---|
| `fonts/` | `/fonts/` | Built-in display fonts (woff2) |
| `thumbnails/` | `/thumbnails/` | Motion-graphics template library thumbnails |
| `voice-samples/` | `/voice-samples/` | TTS preview clips |
| `sound-effects/` | `/sound-effects/` | Sound-effect library |
| `audio/` | `/audio/` | Built-in audio track samples |
| `media/` | `/media/` | Product sample media (e.g. speech-sample; **excludes** uploads) |
| `luts/` | `/luts/` | .cube LUTs |
| `library-previews/` | `/library-previews/` | Library preview images |
| `plugins/` | `/plugins/` | Built-in plugin index / examples |
| `templates/` | `/templates/` | Motion-graphics / voiceover template JSON (compile-time import) |
| `vendor-icons/` | `/vendor-icons/` | Vendor SVGs used in Settings (compile-time import) |
| `favicon.svg` / `icons.svg` | `/` | Site icons |

## Split of responsibility with `public/`

- **`assets/`** (this directory) → built-in product assets, committed to git.
- **`public/media/uploads/`** → user uploads / AI-generated / export intermediates only; gitignored by default.

Dev and build are handled by `server/product-assets.ts` (Vite plugin), which mounts this directory at the site root path; Remotion exports overlay this directory the same way. URLs remain consistent with the pre-`public/` layout.
