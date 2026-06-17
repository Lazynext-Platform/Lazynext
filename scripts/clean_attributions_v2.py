import os
import re

def clean_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return

    original_content = content

    # 1. Replace specific attribution comments and authors
    content = re.sub(r'(?i)Original source: developed for Lazynext.
    content = re.sub(r'(?i)Developed as part of Lazynext.
    content = re.sub(r'(?i)Built with ⚡️ by Lazynext
    content = re.sub(r'Copyright Lazynext-Corporation. All Rights Reserved.
    
    # Replace author names
    content = re.sub(r'(?i)Lazynext-Corporation', 'Lazynext-Corporation', content)
    content = re.sub(r'(?i)Lazynext-Corporation', 'Lazynext-Corporation', content)
    content = re.sub(r'(?i)Lazynext-Corporation', 'Lazynext-Corporation', content)
    content = re.sub(r'(?i)Lazynext-Corporation', 'Lazynext-Corporation', content)
    content = re.sub(r'(?i)Lazynext-Corporation', 'Lazynext-Corporation', content)
    content = re.sub(r'(?i)Lazynext-Corporation', 'Lazynext-Corporation', content)
    content = re.sub(r'LazynextASR', 'LazynextASR', content)
    content = re.sub(r'LazynextClip', 'LazynextClip', content)
    content = re.sub(r'Lazynext-Editor', 'Lazynext-Editor', content)
    
    # 2. Replace any GitHub URLs
    # Match https://github.com/Lazynext-Corporation/REPO and replace USER with Lazynext-Corporation
    content = re.sub(r'https?://github\.com/([^/\s"\'\>]+)/([^/\s"\'\>]+)', r'https://github.com/Lazynext-Corporation/\2', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {filepath}")

def main():
    for root, dirs, files in os.walk('.'):
        if '.git' in root or 'node_modules' in root or 'target' in root:
            continue
        for file in files:
            if file.endswith(('.js', '.ts', '.tsx', '.py', '.md', '.txt', '.toml', '.json', '.nim', '.rs', '.html', '.css', '.scss', '.yaml', '.yml', '.nimble')):
                filepath = os.path.join(root, file)
                clean_file(filepath)

if __name__ == '__main__':
    main()
