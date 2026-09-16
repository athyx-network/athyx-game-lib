import os
import urllib.parse

for root, dirs, files in os.walk('.'):
    if 'index.html' in files and '.git' not in root:
        path = os.path.join(root, 'index.html')
        folder = os.path.basename(os.path.abspath(root))
        if folder == 'athyx-game-lib':
            continue
        encoded_folder = urllib.parse.quote(folder)
        base_tag = f'<base href="https://cdn.jsdelivr.net/gh/athyx-network/athyx-game-lib@main/{encoded_folder}/">'
        with open(path, 'r') as f:
            content = f.read()
        if '<base href=' not in content:
            content = content.replace('<head>', f'<head>\n    {base_tag}')
            with open(path, 'w') as f:
                f.write(content)
        print(f'Processed {path}')
