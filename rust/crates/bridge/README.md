# Lazynext Bridge

Proc-macro for WASM/JS interop conventions.

## Overview

Provides the `#[export]` proc-macro attribute that enforces WASM-bindgen naming conventions and parameter constraints at compile time.

## Rules Enforced

- Function names auto-converted from `snake_case` to `camelCase` for JavaScript consumption
- Functions must accept exactly one argument (an options struct) — positional arguments rejected
- Constants exported as getter functions on the WASM side
- Non-fn/non-const items produce compile errors at the item site
