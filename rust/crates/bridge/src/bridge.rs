//! Lazynext Bridge — proc-macro for WASM/JS interop conventions.
//!
//! The bridge crate provides a `#[export]` proc-macro attribute that
//! enforces WASM-bindgen naming conventions and parameter constraints
//! at compile time.
//!
//! # Rules enforced
//!
//! - Function names are auto-converted from `snake_case` to `camelCase`
//!   for natural JavaScript consumption
//! - Functions must accept exactly one argument (an options struct) —
//!   positional arguments are rejected at compile time
//! - Constants are exported as getter functions on the WASM side
//! - Non-fn/non-const items produce a compile error at the item site
//!
//! # Usage
//!
//! ```ignore
//! use bridge::export;
//!
//! #[export]
//! fn apply_effect(opts: EffectOptions) -> Vec<u8> { ... }
//!
//! #[export]
//! const MAX_BLEND_LAYERS: u32 = 64;
//! ```
//!
//! The macro expands to `#[wasm_bindgen(js_name = "...")]` with the
//! correct camelCase name and validation.

use proc_macro::TokenStream;
use quote::quote;
use syn::{FnArg, Item, ItemConst, ItemFn, parse_macro_input};

/// Attribute macro that exports a `fn` or `const` to JavaScript following
/// Lazynext's WASM interop conventions.
///
/// Functions are re-emitted with a `#[wasm_bindgen(js_name = ...)]` whose
/// name is the camelCase form of the Rust identifier, and are required to
/// take at most one (options-struct) argument. Constants are exported as a
/// getter function. Any other item kind produces a compile error.
#[proc_macro_attribute]
pub fn export(_attr: TokenStream, item: TokenStream) -> TokenStream {
    match parse_macro_input!(item as Item) {
        Item::Fn(function) => export_fn(function),
        Item::Const(constant) => export_const(constant),
        other => syn::Error::new_spanned(other, "#[export] only supports fn and const items")
            .to_compile_error()
            .into(),
    }
}

// Re-emits a function with a camelCase `#[wasm_bindgen(js_name)]`, rejecting
// multiple positional arguments.
fn export_fn(function: ItemFn) -> TokenStream {
    let param_count = function
        .sig
        .inputs
        .iter()
        .filter(|arg| matches!(arg, FnArg::Typed(_)))
        .count();

    if param_count > 1 {
        return syn::Error::new_spanned(
            &function.sig.inputs,
            "#[export] functions must accept a single options struct, not positional arguments. \
             Wrap parameters in a struct: `fn foo(FooOptions { a, b }: FooOptions)`",
        )
        .to_compile_error()
        .into();
    }

    let js_name = snake_to_camel(&function.sig.ident.to_string());

    quote! {
        #[cfg_attr(feature = "wasm", ::wasm_bindgen::prelude::wasm_bindgen(js_name = #js_name))]
        #function
    }
    .into()
}

// Emits the constant plus a WASM getter function that returns its value as f64.
fn export_const(constant: ItemConst) -> TokenStream {
    let js_name = constant.ident.to_string();
    let const_ident = &constant.ident;
    let getter_ident = syn::Ident::new(
        &format!("__const_{}", constant.ident.to_string().to_lowercase()),
        constant.ident.span(),
    );

    quote! {
        #constant

        #[cfg(feature = "wasm")]
        #[::wasm_bindgen::prelude::wasm_bindgen(js_name = #js_name)]
        pub fn #getter_ident() -> f64 {
            #const_ident as f64
        }
    }
    .into()
}

// Converts a snake_case identifier to camelCase.
fn snake_to_camel(name: &str) -> String {
    let mut camel = String::with_capacity(name.len());
    let mut should_uppercase_next = false;

    for character in name.chars() {
        if character == '_' {
            should_uppercase_next = true;
            continue;
        }

        if should_uppercase_next {
            camel.push(character.to_ascii_uppercase());
            should_uppercase_next = false;
            continue;
        }

        camel.push(character);
    }

    camel
}

#[cfg(test)]
mod tests {
    use super::snake_to_camel;

    #[test]
    fn converts_snake_case_to_camel_case() {
        assert_eq!(snake_to_camel("do_something"), "doSomething");
        assert_eq!(snake_to_camel("a_b_c"), "aBC");
        assert_eq!(snake_to_camel("already"), "already");
    }
}
