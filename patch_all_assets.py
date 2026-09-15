import os
import re
import urllib.parse

repo_url = "https://cdn.jsdelivr.net/gh/athyx-network/athyx-game-lib@main"

for root, dirs, files in os.walk('.'):
    if 'index.html' in files and root != '.':
        game_name = os.path.basename(root)
        if game_name == '.git': continue
        
        filepath = os.path.join(root, 'index.html')
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        encoded_game_name = urllib.parse.quote(game_name)
        base_url = f'{repo_url}/{encoded_game_name}/'
        
        # Regex to replace src="..." and href="..."
        # but skip http://, https://, data:, blob:, /
        def replacer_src(match):
            url = match.group(2)
            if url.startswith(('http://', 'https://', 'data:', 'blob:', '/')):
                return match.group(0)
            return f'{match.group(1)}"{base_url}{url}"'
            
        def replacer_href(match):
            url = match.group(2)
            if url.startswith(('http://', 'https://', 'data:', 'blob:', '/')):
                return match.group(0)
            return f'{match.group(1)}"{base_url}{url}"'

        content = re.sub(r'(src\s*=\s*)"([^"]+)"', replacer_src, content)
        content = re.sub(r'(href\s*=\s*)"([^"]+)"', replacer_href, content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")

