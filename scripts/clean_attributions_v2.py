#!/usr/bin/env python3
"""
Clean attribution references in source files.

Only replaces known Lazynext-Corporation attribution patterns.
Does NOT rewrite arbitrary GitHub URLs — only matches known org-owned repos.
"""

import os
import re

# Known Lazynext-Corporation repositories (owner/repo)
KNOWN_LAZYNEXT_REPOS = {
    "clip-anything",
    "lazynext-clip",
    "lazynext-asr",
    "lazynext-editor",
}

# Attribution patterns to replace (old → new)
ATTRIBUTION_REPLACEMENTS = [
    # Normalize org name case
    (r'(?i)lazynext[-_]corporation', 'Lazynext-Corporation'),
    # Normalize repo name references
    (r'(?i)lazynext\s*[-_]\s*asr', 'LazynextASR'),
    (r'(?i)lazynext\s*[-_]\s*clip', 'LazynextClip'),
    (r'(?i)lazynext\s*[-_]\s*editor', 'Lazynext-Editor'),
    # Normalize attribution strings
    (r'Original source: developed for Lazynext\.', 'Original source: developed for Lazynext.'),
    (r'Developed as part of Lazynext\.', 'Developed as part of Lazynext.'),
    (r'Built with [^\s]+ by Lazynext', r'Built with ⚡️ by Lazynext'),
    (r'Copyright Lazynext-Corporation\. All Rights Reserved\.',
     'Copyright Lazynext-Corporation. All Rights Reserved.'),
]

# GitHub URL pattern — only match KNOWN Lazynext-Corporation repos
GITHUB_URL_PATTERN = re.compile(
    r'https?://github\.com/Lazynext-Corporation/([^/\s"\'<>\\)]+)',
    re.IGNORECASE,
)


def clean_file(filepath: str) -> None:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return

    original_content = content

    # Apply attribution replacements
    for pattern, replacement in ATTRIBUTION_REPLACEMENTS:
        content = re.sub(pattern, replacement, content)

    # Normalize known Lazynext-Corporation GitHub URLs (lowercase repo name)
    def normalize_github_url(match: re.Match) -> str:
        repo = match.group(1)
        if repo.lower() in {r.lower() for r in KNOWN_LAZYNEXT_REPOS}:
            return f'https://github.com/Lazynext-Corporation/{repo.lower()}'
        return match.group(0)  # Leave unknown repos unchanged

    content = GITHUB_URL_PATTERN.sub(normalize_github_url, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {filepath}")


def main() -> None:
    for root, dirs, files in os.walk('.'):
        # Skip VCS, dependency, and build directories
        if any(skip in root for skip in ('.git', 'node_modules', 'target', '__pycache__', '.terraform')):
            continue
        for file in files:
            if file.endswith(('.js', '.ts', '.tsx', '.py', '.md', '.txt', '.toml',
                              '.json', '.rs', '.html', '.css', '.scss', '.yaml', '.yml')):
                clean_file(os.path.join(root, file))


if __name__ == '__main__':
    main()
