import itertools
import json
from pathlib import Path
import unittest

from jsonschema import Draft7Validator


ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / 'schemas/3.1.0/dataset.schema.json').read_text())


class RecordingMetadataTests(unittest.TestCase):
    def setUp(self):
        self.record = json.loads(
            (ROOT / 'tests/fixtures/schema-3.1.0/pass/data/datasets.json').read_text()
        )[0]
        self.validator = Draft7Validator(SCHEMA)
        self.recording = {
            'dataset_recording_duration': 4,
            'dataset_recording_duration_unit': 'week',
            'dataset_recording_contiguity': 'noncontiguous',
        }

    def test_all_or_none(self):
        for count in range(4):
            for keys in itertools.combinations(self.recording, count):
                with self.subTest(keys=keys):
                    record = {**self.record, **{k: self.recording[k] for k in keys}}
                    self.assertEqual(self.validator.is_valid(record), count in (0, 3))

    def test_rejects_invalid_values(self):
        for key, values in {
            'dataset_recording_duration': [0, -1, '4', None],
            'dataset_recording_duration_unit': ['', 'month', None],
            'dataset_recording_contiguity': ['', 'continuous', None],
        }.items():
            for value in values:
                with self.subTest(key=key, value=value):
                    self.assertFalse(self.validator.is_valid(
                        {**self.record, **self.recording, key: value}
                    ))

    def test_accepts_fractional_duration_and_contiguous_session(self):
        self.assertTrue(self.validator.is_valid({
            **self.record, **self.recording,
            'dataset_recording_duration': 0.5,
            'dataset_recording_contiguity': 'contiguous',
        }))


if __name__ == '__main__':
    unittest.main()
