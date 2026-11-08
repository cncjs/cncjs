#!/usr/bin/env python3
"""Generate deterministic, synthetic R6 G-code and watch-directory fixtures."""

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/cncjs-r6-20261001")
WATCH = ROOT / "watch-tree"
MANY = ROOT / "watch-siblings"
GCODE = ROOT / "synthetic-100k.gcode"

ROOT.mkdir(parents=True, exist_ok=True)
for path in (WATCH, MANY):
    if path.exists():
        for entry in sorted(path.rglob("*"), reverse=True):
            if entry.is_file() or entry.is_symlink():
                entry.unlink()
            elif entry.is_dir():
                entry.rmdir()
        path.rmdir()
WATCH.mkdir()
MANY.mkdir()

with GCODE.open("w", encoding="ascii", newline="\n") as output:
    headers = ["G21", "G90", "G17", "G94", "G54", "G0 X0 Y0 Z5"]
    for line in headers:
        output.write(line + "\n")
    for index in range(1, 99_994):
        x = (index % 1000) / 10
        y = ((index * 37) % 1000) / 10
        output.write(f"G1 X{x:.1f} Y{y:.1f} Z0 F1200\n")
    output.write("M30\n")

def payload(index):
    return f"(synthetic R6 fixture {index:05d})\nG21\nG90\nG1 X1 Y1 F600\nM30\n"

for directory in range(100):
    folder = WATCH / f"dir-{directory:03d}"
    folder.mkdir()
    for item in range(49):
        index = directory * 49 + item
        (folder / f"fixture-{index:04d}.nc").write_text(payload(index), encoding="ascii")

for index in range(5000):
    (MANY / f"sibling-{index:04d}.nc").write_text(payload(index), encoding="ascii")

project_root = Path(__file__).resolve().parents[7]
config_reference = project_root / "docs/testing/configs/browser-test.cncrc"
config_path = ROOT / "config.cncrc"
config = json.loads(config_reference.read_text(encoding="utf-8"))
config["watchDirectory"] = str(WATCH)
config["ports"] = [{"path": "/tmp/ttyGRBL", "manufacturer": "Grbl Simulator"}]
config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")

def tree_digest(root):
    digest = hashlib.sha256()
    for file_path in sorted(path for path in root.rglob("*") if path.is_file()):
        relative = file_path.relative_to(root).as_posix().encode("utf-8")
        content = file_path.read_bytes()
        digest.update(relative + b"\0" + content + b"\0")
    return digest.hexdigest()

lines = sum(1 for _ in GCODE.open("r", encoding="ascii"))
manifest = {
    "generator": "generate-fixtures.py",
    "config_path": str(config_path),
    "config_reference": "docs/testing/configs/browser-test.cncrc (copied then watchDirectory set to generated fixture)",
    "gcode": {
        "path": str(GCODE),
        "lines": lines,
        "bytes": GCODE.stat().st_size,
        "sha256": hashlib.sha256(GCODE.read_bytes()).hexdigest(),
    },
    "watch_tree": {
        "path": str(WATCH),
        "directories": sum(1 for path in WATCH.rglob("*") if path.is_dir()),
        "files": sum(1 for path in WATCH.rglob("*") if path.is_file()),
        "sha256": tree_digest(WATCH),
    },
    "watch_siblings": {
        "path": str(MANY),
        "directories": 0,
        "files": sum(1 for path in MANY.iterdir() if path.is_file()),
        "sha256": tree_digest(MANY),
    },
}
(ROOT / "fixture-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2))
