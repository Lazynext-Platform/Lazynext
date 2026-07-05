#!/usr/bin/env python3
"""
Clean attribution references in source files (v1 — legacy).

Prefer clean_attributions_v2.py for new workflows.

Usage:
  python3 scripts/clean_attributions_v2.py
"""

import sys

if __name__ == "__main__":
    print("[clean_attributions] v1 is deprecated. Use clean_attributions_v2.py instead.", file=sys.stderr)
    sys.exit(0)
