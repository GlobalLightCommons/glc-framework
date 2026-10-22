#!/usr/bin/env python3
"""Check deployed builder schema copies against the validator's canonical bundle."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
checked = 0
for path in (root / "builder/schemas").rglob("*.json"):
    json.loads(path.read_text())  # Parse historical bundles, preserving their published bytes.
    if path.parent.name != "3.0.2":
        continue
    canonical = root / "validator/schemas" / path.relative_to(root / "builder/schemas")
    if not canonical.is_file():
        raise SystemExit(f"Missing canonical schema: {canonical}")
    if json.loads(path.read_text()) != json.loads(canonical.read_text()):
        raise SystemExit(f"Builder schema differs from canonical schema: {path}")
    checked += 1
print(f"Checked {checked} active builder schema copies against validator/schemas")
