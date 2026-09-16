import os
import re

build_dir = "Baldi's Basics Squared/Build"
os.chdir(build_dir)

for file in os.listdir('.'):
    if '.br' in file:
        new_name = file.replace('.br', '')
        os.rename(file, new_name)
        print(f"Renamed {file} to {new_name}")

os.chdir('..')

with open('index.html', 'r') as f:
    content = f.read()

content = content.replace('.data.br', '.data')
content = content.replace('.wasm.br', '.wasm')
content = content.replace('.framework.js.br', '.framework.js')

with open('index.html', 'w') as f:
    f.write(content)

print("Updated index.html")
