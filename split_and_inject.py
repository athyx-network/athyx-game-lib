import os
import shutil

chunk_size = 19 * 1024 * 1024
source_merger = "Caseoh's Basics in eating and fastfood/fileMerger.js"

for root, dirs, files in os.walk('.'):
    if '.git' in root or 'Caseoh' in root or 'Baldi\'s Basics Plus' in root or 'Baldi\'s Basics Remastered' in root:
        continue
    
    large_files = []
    for file in files:
        if file in ['index.html', 'fileMerger.js', 'inject_base.py', 'split_and_inject.py']: continue
        if file.endswith('.part1') or file.endswith('.part2') or file.endswith('.part3') or file.endswith('.part4') or file.endswith('.part5'): continue
        
        path = os.path.join(root, file)
        if os.path.isfile(path):
            size = os.path.getsize(path)
            if size > chunk_size:
                large_files.append((path, size))
    
    if large_files:
        game_root = root
        while not os.path.exists(os.path.join(game_root, 'index.html')) and game_root != '.':
            game_root = os.path.dirname(game_root)
            
        if game_root == '.':
            continue
            
        print(f"Game {game_root} has large files: {large_files}")
        merger_dest = os.path.join(game_root, 'fileMerger.js')
        shutil.copy(source_merger, merger_dest)
        
        with open(merger_dest, 'r') as fm:
            fm_content = fm.read()
        
        # Remove the gn-math links
        fm_content = fm_content.replace('<a href="https://www.gn-math.dev/" style="font-size: 15px; color: #d42222; text-decoration: underline; margin-bottom: 10px; display: block;">gn-math</a>', '')
        fm_content = fm_content.replace('<a href="https://docs.google.com/document/d/1_FmH3BlSBQI7FGgAQL59-ZPe8eCxs35wel6JUyVaG8Q/" style="font-size: 15px; color: #14b4f3; text-decoration: underline; margin-bottom: 10px; display: block;">ugs</a>', '')
        
        with open(merger_dest, 'w') as fm:
            fm.write(fm_content)
        
        files_config = []
        for path, size in large_files:
            rel_path = os.path.relpath(path, game_root).replace('\\', '/')
            
            with open(path, 'rb') as f:
                data = f.read()
            
            parts = 0
            for i in range(0, len(data), chunk_size):
                parts += 1
                with open(f"{path}.part{parts}", 'wb') as f:
                    f.write(data[i:i+chunk_size])
            
            os.remove(path)
            files_config.append(f"{{ name: '{rel_path}', parts: {parts} }}")
        
        index_path = os.path.join(game_root, 'index.html')
        with open(index_path, 'r') as f:
            content = f.read()
            
        if 'window.fileMergerConfig' not in content:
            config_script = f"""
    <script>
      window.fileMergerConfig = {{
        files: [ {', '.join(files_config)} ],
        basePath: ""
      }};
    </script>
    <script src="fileMerger.js"></script>
"""
            # We want to replace </head> or </head > or </head   >
            import re
            content = re.sub(r'</head\s*>', config_script + '</head>', content, count=1, flags=re.IGNORECASE)
                
            with open(index_path, 'w') as f:
                f.write(content)
