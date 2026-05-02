#!/usr/bin/env python3
# scripts/extract-zip.py
# Extracts a zip archive preserving exact filename casing.
# Usage: python3 scripts/extract-zip.py <zipfile> <destination>

import sys
import zipfile

if len(sys.argv) != 3:
    print("Usage: extract-zip.py <zipfile> <destination>")
    sys.exit(1)

zip_path = sys.argv[1]
dest = sys.argv[2]

with zipfile.ZipFile(zip_path) as z:
    names = z.namelist()
    z.extractall(dest)
    print(f"Extracted {len(names)} files from {zip_path} → {dest}/")
