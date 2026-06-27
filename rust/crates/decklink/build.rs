fn main() {
    // The DeckLink C++ SDK bridge is only compiled when the `decklink-sdk`
    // feature is enabled. Without it, we use the pure-Rust simulation.
    #[cfg(feature = "decklink-sdk")]
    {
        cxx_build::bridge("src/lib.rs")
            .file("src/decklink_api.cc")
            .flag_if_supported("-std=c++14")
            .compile("decklink_hardware");
    }

    println!("cargo:rerun-if-changed=src/lib.rs");
    println!("cargo:rerun-if-changed=src/decklink_api.cc");
    println!("cargo:rerun-if-changed=src/decklink_api.h");
}
