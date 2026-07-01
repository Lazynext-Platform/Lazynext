# Cyber Glitch Effect Plugin

Real-time glitch distortion effect for Lazynext's Rust GPU compositor.

## Overview

This plugin applies a chromatic-aberration-style glitch effect to video frames
at the compositor level. It compiles to a WASM-compatible `cdylib` and is
loaded by the Lazynext engine via the plugin API.

## Structure

```
plugins/glitch-effect/
├── Cargo.toml     # Rust crate config (cdylib, depends on lazynext_plugin_api)
└── src/
    └── lib.rs     # Glitch effect implementation
```

## Build

```bash
cd plugins/glitch-effect
cargo build --target wasm32-unknown-unknown --release
```

The output `.wasm` binary can be registered with the Lazynext compositor at
runtime through `registerPlugin()` from `@lazynext/plugin-sdk`.

## Dependencies

- **lazynext_plugin_api** (`../../rust/plugin-api`) — shared trait definitions
  for the plugin host interface.

## License

MIT
