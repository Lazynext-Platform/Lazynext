# 📚 Promotions Review

## What Went Well
- Rust workspace modularity allowed cleanly adding `crates/promotions`.
- GPUI, React Native, and Chrome MV3 setups allowed fast scaffolding of the UI views for the 7 respective environments.
- API Gateway acts as a clean bridge for MCP integration.

## What Went Wrong
- Adding CLI commands (`lazynext account promos ...`) required refactoring the `clap::Subcommand` derives to properly derive `Debug`.

## What Was Learned
- When adding MCP tools, you must ensure both the `TOOLS` array and the `switch (name)` handler are updated, and that the type unions align to prevent TypeScript errors.

## Next Feature Focus
- Continue hardening the `collab-server` to allow syncing `wallet_balance` dynamically via CRDTs if we want to add live tipping during a collaboration session.
