"""
Path-safety helpers.

User-supplied identifiers must never be used directly to build filesystem
paths or command-line arguments. These helpers sanitize identifiers to a
strict allowlist and confine the resulting paths inside a trusted base
directory, defeating path-traversal and command-injection attempts.
"""

import os
import re

BASE_TMP_DIR = os.getenv("GENSTUDIO_TMP_DIR", "/tmp")

_SLUG_RE = re.compile(r"[^A-Za-z0-9_-]")


def safe_slug(value: str, fallback: str = "output") -> str:
    """Sanitize a user-supplied identifier for safe use in a filename.

    Strips every character outside ``[A-Za-z0-9_-]`` and trims leading
    dots/underscores so the result can never be ``.`` , ``..`` or hidden.
    """
    slug = _SLUG_RE.sub("_", (value or "").strip())
    slug = slug.strip("._")
    return slug or fallback


def safe_tmp_path(name: str, fallback: str = "output") -> str:
    """Build an absolute path inside ``BASE_TMP_DIR`` from a sanitized name.

    The file extension (if any) is preserved; the stem is passed through
    :func:`safe_slug`. The final path is re-checked with ``os.path.realpath``
    to guarantee it does not escape the base directory.
    """
    stem, ext = os.path.splitext(os.path.basename(name or ""))
    ext_clean = _SLUG_RE.sub("", ext)
    safe_ext = f".{ext_clean}" if ext_clean else ""
    filename = f"{safe_slug(stem, fallback)}{safe_ext}"
    base = os.path.realpath(BASE_TMP_DIR)
    candidate = os.path.realpath(os.path.join(base, filename))
    if candidate != base and not candidate.startswith(base + os.sep):
        raise ValueError("resolved path escapes the base directory")
    return candidate
