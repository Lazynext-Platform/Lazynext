//! Build script for the core crate. Generates UniFFI scaffolding
//! from the lazynext UDL definition for cross-language bindings.

fn main() {
    uniffi_build::generate_scaffolding("./uniffi/lazynext.udl").unwrap();
}
