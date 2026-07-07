# Lazynext GPU

WebGPU/wgpu device context and shared GPU resources.

## Overview

Manages the GPU lifecycle — adapter selection, device creation, surface configuration, and shared shader resources. The foundation that the compositor, effects, and masks crates build upon.

## Key Types

- **`GpuContext`** — Owns the wgpu instance, adapter, device, and queue. Created once per application session.
- **`GpuError`** — Typed error enum for adapter unavailability, device loss, and surface format mismatches.

## Shared Shaders

- `fullscreen.wgsl` — Full-screen quad vertex shader
- `blit.wgsl` — Simple texture copy
- `compositor.wgsl` — Vertex + fragment pipeline for layer composition
- `scopes.wgsl` — Histogram compute shader for video scoping
