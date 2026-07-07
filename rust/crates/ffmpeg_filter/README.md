# Lazynext FFmpeg Filter

Type-safe Rust API for constructing FFmpeg filter graphs.

## Overview

Provides a programmatic interface for building FFmpeg `-filter_complex` argument strings, constructing filter chains, and validating filter configurations before passing them to the FFmpeg CLI or libavfilter.

## Modules

- **filter** — Individual filter node definitions (scale, crop, overlay, etc.)
- **graph** — Directed acyclic graph of filter nodes with input/output pin validation
- **presets** — Pre-built filter chains for common NLE operations
- **types** — Shared type definitions for filter parameters and validation
