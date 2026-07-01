#!/usr/bin/env python3
"""
Clean attribution references in source files (v1 — legacy).

Replaces known Lazynext-Corporation attribution patterns and normalizes
GitHub URLs. Prefer clean_attributions_v2.py for new workflows.

Usage:
  python3 scripts/clean_attributions.py
"""

import os
import re

def clean_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return

    original_content = content

    # 1. Replace specific attribution comments
    content = re.sub(r'Original source: developed for Lazynext.
    content = re.sub(r'Developed as part of Lazynext. 'Developed as part of Lazynext.', content)
    content = re.sub(r'Built with ⚡️ by Lazynext
    
    # 2. Replace Lazynext-Corporation/Clip-Anything with Lazynext-Corporation/clip-anything
    content = re.sub(r'Lazynext-Corporation/Clip-Anything', 'Lazynext-Corporation/Clip-Anything', content)
    content = re.sub(r'Lazynext-Corporation', 'Lazynext-Corporation', content)
    
    # 3. Replace Alibaba DAMO Academy/LazynextClip with Lazynext
    content = re.sub(r'Lazynext-Corporation/LazynextClip', 'Lazynext-Corporation/LazynextClip', content)
    content = re.sub(r'Lazynext-Corporation/LazynextASR', 'Lazynext-Corporation/LazynextASR', content)
    content = re.sub(r'Lazynext-Corporation', 'Lazynext-Corporation', content)
    content = re.sub(r'LazynextASR', 'LazynextASR', content)
    content = re.sub(r'LazynextASR', 'LazynextASR', content)
    content = re.sub(r'LazynextClip', 'LazynextClip', content)
    
    # 4. Replace other github links to generic or Lazynext ones if they are attributions
    content = re.sub(r'https://github\.com/testing-library/jest-dom', 'https://github.com/Lazynext-Corporation/jest-dom', content)
    
    # 5. Copyright Lazynext-Corporation. All Rights Reserved.
    content = re.sub(r'Copyright Lazynext-Corporation. All Rights Reserved.
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {filepath}")

def main():
    for root, dirs, files in os.walk('.'):
        if '.git' in root or 'node_modules' in root or 'target' in root:
            continue
        for file in files:
            if file.endswith(('.js', '.ts', '.tsx', '.py', '.md', '.txt', '.toml', '.json', '.nim', '.rs', '.html', '.css', '.scss', '.yaml', '.yml')):
                filepath = os.path.join(root, file)
                clean_file(filepath)

if __name__ == '__main__':
    main()
