# Provenance — C2PA Content Authenticity

Cryptographic content provenance for Lazynext render outputs. Implements the [C2PA 2.1 specification](https://c2pa.org/specifications/specifications/2.1/) for verifiable media authenticity.

## Features

- **SHA-256 hashing** of rendered output files
- **HMAC-SHA256 signing** for manifest integrity
- **C2PA manifest generation** with full metadata:
  - Organization identity (name, URL)
  - Software agent (Lazynext NLE Core v1.0.0)
  - Editing operations summary (tracks, clips, duration)
  - Content hash for tamper detection
  - Creation timestamp
- **Sidecar `.c2pa.json` output** alongside rendered files

## Usage

```rust
use provenance::C2PASigner;

let signer = C2PASigner::default();
signer.sign_render("output.mp4", &timeline_data)?;
// Produces: output.c2pa.json
```

## Production Path

- **ECDSA P-256** signing with X.509 certificates (currently HMAC-SHA256 dev signing)
- **JUMBF embedding** directly into MP4/MOV files (currently sidecar JSON)
- **Trusted CA integration** (DigiCert, GlobalSign)

## Status

Dev-ready with HMAC-SHA256 signing and SHA-256 hashing. Full PKI/X.509 integration deferred for production deployment.
