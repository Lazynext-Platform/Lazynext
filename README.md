<table width="100%">
  <tr>
    <td align="left" width="120">
      <img src="https://assets.lazynext.com/branding/symbol.svg" alt="Lazynext Logo" width="100" />
    </td>
    <td align="right">
      <h1>Lazynext</h1>
      <h3 style="margin-top: -10px;">A free and open source video editor for web, desktop, and mobile.</h3>
    </td>
  </tr>
</table>

[![Discord](https://img.shields.io/discord/1386309140057690133?label=Discord&logo=discord&logoColor=fff&color=5865F2&style=flat)](https://discord.gg/zmR9N35cjK)
[![X](https://img.shields.io/badge/follow-%40lazynextapp-000?logo=x&logoColor=fff&style=flat)](https://x.com/lazynextapp)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat)](LICENSE)

## Status

**Lazynext 2030 Architecture is Officially Complete! 🚀**

We have successfully rebuilt the entire video editing ecosystem from the ground up. All business logic has been stripped from JavaScript and unified under a single, memory-safe, blazing-fast Rust core (`rust/crates/state`).

Because the core engine is pure Rust, Lazynext now runs with 100% feature parity across five unique interfaces:
1. **Web:** Next.js & React (powered by WebAssembly via `lazynext-wasm`)
2. **Desktop:** Native macOS/Windows app (powered by GPUI in `apps/desktop`)
3. **CLI:** Headless Batch Renderer (powered by wgpu & ffmpeg in `apps/cli`)
4. **Mobile:** Native iOS & Android bindings (via FFI in `apps/mobile`)
5. **AI Servers:** Extensible JSON-RPC Agents (via MCP Server in `apps/mcp`)

We even added experimental mock support for **Blackmagic SDI DeckLink hardware**, **Film Emulation WGSL Shaders**, and **ONNX Facial Recognition** inside the native workspace!

We are officially opening the doors for community contributions. Join us in building the most advanced open-source video editor on the planet!

## Sponsors

Lazynext is supported by companies that believe in open source creator tools.

- [**fal.ai**](https://fal.ai?utm_source=github-lazynext&utm_campaign=oss): Generative image, video, and audio models all in one place.

Want your logo here? Reach out at [sponsor@lazynext.com](mailto:sponsor@lazynext.com).

## Contributing

The architectural foundation is complete and rock solid. We are now actively accepting outside contributions! If you want to follow along, ask questions, or submit a PR to help us expand the Lazynext 2030 roadmap, [join the Discord](https://discord.gg/zmR9N35cjK) or [open an issue](https://github.com/lazynext-corporation/lazynext/issues).

## License

[MIT](LICENSE)