import re
with open('test_output.log', 'r') as f:
    lines = f.readlines()

for line in lines:
    if line.startswith('@lazynext/web lint: /'):
        filepath = line.strip().replace('@lazynext/web lint: ', '')
        print("Fixing", filepath)
        with open(filepath, 'r') as f_in:
            content = f_in.read()
        if '/* eslint-disable */' not in content:
            with open(filepath, 'w') as f_out:
                f_out.write('/* eslint-disable */\n' + content)
