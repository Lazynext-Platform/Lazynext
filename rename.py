import os

def replace_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except (UnicodeDecodeError, IsADirectoryError):
        return

    original_content = content
    content = content.replace('Lazynext-Corporation', 'Lazynext-Corporation')
    content = content.replace('lazynext-classic', 'lazynext-classic')
    content = content.replace('lazynext-corporation', 'lazynext-corporation')
    content = content.replace('lazynext.com', 'lazynext.com')
    content = content.replace('Lazynext', 'Lazynext')
    content = content.replace('lazynext', 'lazynext')
    content = content.replace('LAZYNEXT', 'LAZYNEXT')

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")

def rename_directories_and_files(path):
    for root, dirs, files in os.walk(path, topdown=False):
        for name in files:
            if 'lazynext' in name.lower():
                new_name = name.replace('lazynext', 'lazynext').replace('Lazynext', 'Lazynext').replace('LAZYNEXT', 'LAZYNEXT')
                os.rename(os.path.join(root, name), os.path.join(root, new_name))
        for name in dirs:
            if name in ['.git', 'node_modules', 'target', '.next', '.turbo', 'pkg']:
                continue
            if 'lazynext' in name.lower():
                new_name = name.replace('lazynext', 'lazynext').replace('Lazynext', 'Lazynext').replace('LAZYNEXT', 'LAZYNEXT')
                os.rename(os.path.join(root, name), os.path.join(root, new_name))

def main():
    skip_dirs = {'.git', 'node_modules', 'target', '.next', '.turbo', 'pkg'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for name in files:
            if name.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.lock')):
                continue
            if name == 'bun.lock' or name == 'Cargo.lock':
                continue
            file_path = os.path.join(root, name)
            replace_in_file(file_path)

if __name__ == '__main__':
    main()
    rename_directories_and_files('.')
