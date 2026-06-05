fn main() {
    cxx_build::bridge("src/lib.rs")
        .file("src/decklink_api.cc")
        .flag_if_supported("-std=c++14")
        .compile("decklink_hardware");

    println!("cargo:rerun-if-changed=src/lib.rs");
    println!("cargo:rerun-if-changed=src/decklink_api.cc");
    println!("cargo:rerun-if-changed=src/decklink_api.h");
}
