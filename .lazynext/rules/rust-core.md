---
paths: "rust/core/src/**"
priority: 10
description: "Rust core conventions"
---
# Rust Core Rules
- All business logic goes here, never in apps/
- Use tracing crate for logging, never println!
- CRDT operations go through NLEState
