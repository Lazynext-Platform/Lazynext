/**
 * @module wasm
 * @description WASM bridge public API — re-exports media-time helpers
 *   and directly re-exports scalar/discrete channel evaluators from the
 *   Rust-compiled WASM package.
 */

export * from "./media-time";
export { evaluateScalarChannel, evaluateDiscreteChannel } from "lazynext-wasm";
