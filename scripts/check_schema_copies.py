#!/usr/bin/env python3
"""Check deployed builder schema copies against the validator's canonical bundle."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parents[1]
checked = 0
for path in (root / "builder/schemas").rglob("*.json"):
    json.loads(path.read_text())  # Parse historical bundles, preserving their published bytes.
    if path.parent.name != "3.2.0":
        continue
    canonical = root / "validator/schemas" / path.relative_to(root / "builder/schemas")
    if not canonical.is_file():
        raise SystemExit(f"Missing canonical schema: {canonical}")
    if json.loads(path.read_text()) != json.loads(canonical.read_text()):
        raise SystemExit(f"Builder schema differs from canonical schema: {path}")
    checked += 1
print(f"Checked {checked} active builder schema copies against validator/schemas")

with zipfile.ZipFile(root / 'viewer/assets/downloads/glc-schemas-3.2.0.zip') as archive:
    for canonical in (root / 'validator/schemas/3.2.0').glob('*.json'):
        expected = json.loads(canonical.read_text())
        expected_id = ('https://raw.githubusercontent.com/GlobalLightCommons/'
                       'glc-framework/main/validator/schemas/3.2.0/' + canonical.name)
        if expected.get('$id') != expected_id:
            raise SystemExit(f'Active schema must use its monorepo canonical ID: {canonical}')
        name = canonical.name.replace('.schema.json', '').replace('.json', '')
        viewer_name = 'participant' if name == 'participants' else name
        viewer_file = ('glc-dp-profile.json' if name == 'glc-dp-profile'
                       else viewer_name + '_schema.json')
        copies = [
            root / 'viewer/example/schemas/3.2.0' / canonical.name,
            root / 'viewer/_data' / viewer_file,
            root / 'validator/tests/fixtures/schema-3.2.0/pass/schemas/3.2.0' / canonical.name,
        ]
        for path in copies:
            if json.loads(path.read_text()) != expected:
                raise SystemExit(f'Schema copy differs from canonical schema: {path}')
        member = 'example/schemas/3.2.0/' + canonical.name
        if json.loads(archive.read(member)) != expected:
            raise SystemExit(f'Downloaded schema differs from canonical schema: {member}')
print('Checked active viewer, fixture, and downloadable schema copies')
