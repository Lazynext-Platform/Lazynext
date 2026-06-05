<table width="100%">
  <tr>
    <td align="left" width="120">
      <img src="https://assets.lazynext.com/branding/symbol.svg" alt="Lazynext Logo" width="100" />
    </td>
    <td align="right">
      <h1>Lazynext 2030</h1>
      <h3 style="margin-top: -10px;">The World's First Fully Autonomous, Agentic, Prompt-to-Video Editing Platform.</h3>
    </td>
  </tr>
</table>

[![Discord](https://img.shields.io/discord/1386309140057690133?label=Discord&logo=discord&logoColor=fff&color=5865F2&style=flat)](https://discord.gg/zmR9N35cjK)
[![X](https://img.shields.io/badge/follow-%40lazynextapp-000?logo=x&logoColor=fff&style=flat)](https://x.com/lazynextapp)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat)](LICENSE)

## The Paradigm Shift

**The traditional timeline is dead. 🚀**

We have completely ripped out the complex tracks, the razor blade tools, and the overwhelming legacy UI. Lazynext has successfully pivoted to a **100% Agentic Architecture**. You do not edit the video yourself anymore; you simply chat with a built-in AI (powered natively by Anthropic's Claude 3.5 Sonnet), and the AI directly mutates the video project state on your behalf.

## How It Works

Because we separated all the business logic into a single, memory-safe, blazing-fast Rust core (`rust/crates/state` and `rust/crates/agent`), Lazynext is able to run the exact same LLM-driven video editing brain seamlessly across **five** unique interfaces:

1. **Web Agent:** A React-based floating Chat UI running Next.js.
2. **Desktop Agent:** A native macOS/Windows GPUI Chat interface running natively next to the massive video canvas.
3. **CLI Agent:** A hacker-style TUI (`lazynext-cli prompt "cut the video"`) that runs entirely headless.
4. **Mobile Voice Agent:** Native iOS & Android bindings providing a voice-first agentic interface on the go.
5. **MCP Server:** An open JSON-RPC agent protocol allowing *any* external AI to connect and edit videos in Lazynext!

Under the hood, the AI issues structured `ToolCall` JSON commands (like `cut_silences` or `color_grade`), and the Rust backend mathematically slices the clips and applies WGSL shaders natively via `wgpu`. 

## Sponsors

Lazynext is supported by companies that believe in open source creator tools.

- [**fal.ai**](https://fal.ai?utm_source=github-lazynext&utm_campaign=oss): Generative image, video, and audio models all in one place.

Want your logo here? Reach out at [sponsor@lazynext.com](mailto:sponsor@lazynext.com).

## Contributing

The architectural foundation of the agentic era is complete and rock solid. We are now actively accepting outside contributions! If you want to help us expand the Lazynext 2030 autonomous roadmap, [join the Discord](https://discord.gg/zmR9N35cjK) or [open an issue](https://github.com/lazynext-corporation/lazynext/issues).

## License

[MIT](LICENSE)