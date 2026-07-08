# Architecture Deep-Dive: GPU Compositor Pipeline

This document explains how Lazynext turns timeline state into rendered frames
on the GPU. It complements the crate summary in
[developer-guide.md](../developer-guide.md#rustcratescompositor--gpu-compositor)
and covers the `rust/crates/compositor`, `rust/crates/gpu`,
`rust/crates/effects`, and `rust/crates/masks` crates.

---

## Design goals

- **One renderer, every surface.** The same Rust compositor renders to a
  browser canvas (via WASM/WebGPU), a native desktop window (via wgpu), and an
  offscreen texture for export. No per-platform rendering logic.
- **WYSIWYG export.** The preview and the exported file are produced by the same
  code path, so what you see is what you get.
- **Frame-accurate.** Rendering is driven by `MediaTime` (120,000 ticks/sec)
  and evaluated animated properties, not wall-clock time.

---

## Crate layering

```
gpu (device/context)          ← wgpu instance, adapter, device, queue, shaders
 └── compositor               ← layer stack, blend, transforms, frame descriptor
      ├── effects             ← 11 GPU effect passes (+ 3D LUT, chroma key)
      └── masks               ← JFA signed-distance-field masks + feather + SAM2
```

- **`gpu`** owns the wgpu lifecycle (`GpuContext`) and two shared WGSL shaders
  (`fullscreen.wgsl`, `compositor.wgsl`), plus the scopes analyzer.
- **`compositor`** consumes a `FrameDescriptor` and renders it.
- **`effects`** and **`masks`** are dispatched as passes within a frame.

---

## The FrameDescriptor (`frame.rs`)

The compositor is **stateless per frame** in intent: the caller builds a
`FrameDescriptor` describing everything to draw, then calls `render_frame`.

```
FrameDescriptor
├── width, height
├── clear: CanvasClearDescriptor { color: [f32; 4] }
└── items: Vec<FrameItemDescriptor>
    ├── Layer(LayerDescriptor)          ← video/image quad
    │   ├── texture_id, transform, opacity, blend_mode
    │   ├── effect_pass_groups          ← ordered effect chains
    │   ├── mask, color_grading, crop
    │   ├── border_radius, shadow
    │   └── luma_key_threshold/tolerance
    ├── TextLayer(TextLayerDescriptor)  ← MSDF-rendered text
    └── SceneEffect { effect_pass_groups } ← full-scene passes
```

This descriptor is what CRDT timeline state is *compiled into* each frame
(on web, `scene-builder.ts` → `frame-descriptor.ts` → WASM `renderFrame`).

---

## Render pipeline (`compositor.rs::render_frame`)

1. **Recycle** — `texture_pool.recycle_frame()` returns last frame's textures to
   the pool (`texture_pool.rs`), avoiding per-frame GPU allocations.
2. **Acquire surface** — get the target surface texture + view.
3. **Clear** — fill with `CanvasClearDescriptor.color`.
4. **Per layer**, in order:
   - Look up the source texture in the `TextureStore` (`texture_store.rs`),
     keyed by media ID so unchanged media is not re-uploaded.
   - Apply the **quad transform** (`layer.wgsl`) — position, scale, rotation,
     crop, border radius.
   - Apply **effect pass groups** (`effects` crate) into recycled render targets.
   - Apply the **mask** if present (`masks` crate → alpha matte).
   - **Blend** onto the accumulator using the selected `BlendMode`
     (`blend.wgsl`, 17 modes).
5. **Text layers** are rendered from an MSDF atlas (`msdf.rs`, `msdf.wgsl`) for
   resolution-independent glyphs.
6. **Scene effects** run over the composited result.
7. **Submit** the command buffer to the queue.

---

## Key subsystems

### Blend modes (`blend_mode.rs`, `blend.wgsl`)

17 Photoshop-compatible modes (Normal, Multiply, Screen, Overlay, Soft/Hard
Light, Difference, Hue/Saturation/Color/Luminosity, …) implemented per the W3C
Compositing & Blending spec. Non-separable modes use the
`lum`/`sat`/`clip_color`/`set_lum`/`set_sat` helpers.

### Effects (`effects` crate)

11 WGSL effect shaders (chromatic aberration, vignette, film grain, bloom,
glitch, pixelate, sharpen, blur, color matrix, noise, optical flow) plus a
trilinear **3D LUT** path (`lut_3d.wgsl`) and **chroma key**. The
`EffectPipeline` batches passes into a single encoder for throughput.

### Masks (`masks` crate)

- **JFA-SDF** — a Jump Flood Algorithm computes a signed distance field from a
  polygon (`jfa_init` → `jfa_step` × log n → `jfa_distance`), giving
  resolution-independent, anti-aliased masks in O(log n) passes.
- **Feather** — Gaussian blur along mask edges for soft compositing.
- **SAM2** — AI segmentation via ONNX for automatic rotoscoping.

### Color management (`aces.rs`, `lut.rs`)

Real ACES IDT/ODT matrices for scene-referred grading; `.cube` 3D LUTs with
built-in presets and trilinear interpolation.

### 3D & stereo (`transforms3d.rs`, `stereoscopic.rs`)

Perspective camera transforms and left/right-eye stereoscopic rendering.

---

## Surface targets

| Target | Path | Entry |
|--------|------|-------|
| Browser | WASM → WebGPU/WebGL canvas | `rust/wasm/src/compositor.rs::render_frame` |
| Desktop | native wgpu window | `rust/core` CoreEngine → compositor |
| Export | offscreen texture → readback → FFmpeg | `render_frame_to_target` + `export` crate |

Because all three build the same `FrameDescriptor` and call the same
`Compositor::render_frame`, output is identical across surfaces.

---

## Performance notes

- **TexturePool** recycles render targets by `(width, height)` each frame.
- **TextureStore** caches decoded media by ID across frames (critical for
  timeline scrubbing).
- Per-frame sub-span timings are recorded via `rust/wasm/src/perf.rs` and
  surfaced to the web app through `getLastFrameProfile()`.

See also: [architecture-crdt.md](architecture-crdt.md) for how the state that
feeds the descriptor converges, and [architecture-data-flow.md](architecture-data-flow.md)
for the full system picture.
