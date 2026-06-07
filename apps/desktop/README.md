# Lazynext Desktop

Native desktop NLE application built with GPUI + wgpu. Cross-platform.

## Platform Support

| OS | GPU Backend | Status |
|---|---|---|
| **macOS** | Metal (native) | ✅ Primary |
| **Windows** | Vulkan / DX12 | ✅ Supported |
| **Linux** | Vulkan | ✅ Supported |

## Setup

### macOS
```bash
./script/setup-rust
cargo run -p lazynext-desktop
```

### Windows
```powershell
powershell -ExecutionPolicy Bypass -File .\script\setup-windows.ps1
cargo run -p lazynext-desktop
```

### Linux
```bash
chmod +x script/setup-linux.sh
./script/setup-linux.sh
cargo run -p lazynext-desktop
```

## Architecture
- **UI Framework**: GPUI 0.2.2
- **GPU**: wgpu — Metal (macOS), Vulkan (Win/Linux), DX12 (Win)
- **Video**: Custom Rust compositor with WGSL shaders
- **AI**: 20+ model providers

## GPU Backend
Auto-selects best backend. Override with:
```bash
WGPU_BACKEND=vulkan cargo run -p lazynext-desktop
```
