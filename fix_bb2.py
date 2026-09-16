import os
import subprocess
import re

build_dir = "Baldi's Basics Squared/Build"
os.chdir(build_dir)

# 1. Reconstruct .br files
def reconstruct(name, parts_count):
    with open(name, 'wb') as out:
        for i in range(1, parts_count + 1):
            with open(f"{name}.part{i}", 'rb') as f:
                out.write(f.read())
            os.remove(f"{name}.part{i}")

reconstruct("BB^2FDemoV1.0eWeb.data.br", 7)
reconstruct("BB^2FDemoV1.0eWeb.wasm.br", 3)

# 2. Decompress
subprocess.run(["brotli", "-d", "BB^2FDemoV1.0eWeb.data.br"])
subprocess.run(["brotli", "-d", "BB^2FDemoV1.0eWeb.wasm.br"])
subprocess.run(["brotli", "-d", "BB^2FDemoV1.0eWeb.framework.js.br"])

# 3. Delete .br
os.remove("BB^2FDemoV1.0eWeb.data.br")
os.remove("BB^2FDemoV1.0eWeb.wasm.br")
os.remove("BB^2FDemoV1.0eWeb.framework.js.br")

# 4. Split uncompressed files
chunk_size = 19 * 1024 * 1024

def split_file(name):
    with open(name, 'rb') as f:
        data = f.read()
    parts = 0
    for i in range(0, len(data), chunk_size):
        parts += 1
        with open(f"{name}.part{parts}", 'wb') as f:
            f.write(data[i:i+chunk_size])
    os.remove(name)
    return parts

data_parts = split_file("BB^2FDemoV1.0eWeb.data")
wasm_parts = split_file("BB^2FDemoV1.0eWeb.wasm")

# 5. Update index.html
os.chdir("..")

with open("index.html", "r") as f:
    content = f.read()

content = content.replace("BB^2FDemoV1.0eWeb.data.br", "BB^2FDemoV1.0eWeb.data")
content = content.replace("BB^2FDemoV1.0eWeb.wasm.br", "BB^2FDemoV1.0eWeb.wasm")
content = content.replace("BB^2FDemoV1.0eWeb.framework.js.br", "BB^2FDemoV1.0eWeb.framework.js")

content = re.sub(r"name:\s*'Build/BB\^2FDemoV1\.0eWeb\.data',\s*parts:\s*\d+", f"name: 'Build/BB^2FDemoV1.0eWeb.data', parts: {data_parts}", content)
content = re.sub(r"name:\s*'Build/BB\^2FDemoV1\.0eWeb\.wasm',\s*parts:\s*\d+", f"name: 'Build/BB^2FDemoV1.0eWeb.wasm', parts: {wasm_parts}", content)

with open("index.html", "w") as f:
    f.write(content)
