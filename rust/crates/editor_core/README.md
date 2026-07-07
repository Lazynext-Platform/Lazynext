# Lazynext Editor Core

WASM-bindgen bridge for web editors — exposes the CRDT collaboration engine to JavaScript.

## Overview

The primary interface through which the web app receives and applies real-time timeline mutations from other editors. Compiled to WebAssembly and loaded by the Next.js frontend via `use-wasm.ts`.

## Exports

- **`initialize_editor()`** — One-time setup, initializes the WASM runtime
- **`apply_crdt_delta(current_state, delta_state)`** — Applies a CRDT delta to the current state and returns the merged result as JSON. Used by `crdt-sync.ts` to merge incoming operations from peers.
