# @lazynext/plugin-sdk

TypeScript bindings and type definitions for Lazynext WASM plugins.

## Overview

The SDK defines the interfaces that third-party plugins implement and consume:

- `Timeline`, `Track`, `Clip` — the timeline data model exposed to plugins
- `WasmPlugin` — the interface every WASM plugin must implement
- `registerPlugin()` — registers a plugin with the Lazynext engine via FFI

## Installation

```bash
bun add @lazynext/plugin-sdk
```

## Usage

```ts
import { registerPlugin, type WasmPlugin } from "@lazynext/plugin-sdk";

const myPlugin: WasmPlugin = {
  id: "my-custom-effect",
  processFrame(buffer, width, height) {
    // pixel manipulation logic
    return buffer;
  },
};

registerPlugin(myPlugin);
```

## Build

```bash
bun run build   # tsc
```

## License

MIT
