import * as wasm from "lazynext-wasm";
import { expect, test } from "bun:test";

test("WASM import", () => {
    expect(wasm.resolveTrackPlacement).toBeDefined();
});
