import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import glc_validator

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/schema-3.2.0/pass"
SCHEMA = ROOT / "schemas/3.2.0/device.schema.json"


class CalibrationTests(unittest.TestCase):
    def setUp(self):
        self.device = json.loads((FIXTURE / "data/devices.json").read_text())[0]

    def errors(self, value):
        device = {**self.device, "device_calibration_date": value}
        return glc_validator.validate_against_json_schema([device], str(SCHEMA), "devices")

    def test_supported_declarations(self):
        for value in ("uncalibrated", "2024-02-29", "2026-01-15", "0001-01-01"):
            with self.subTest(value=value):
                self.assertEqual(self.errors(value), [])

    def test_rejects_placeholders_and_impossible_dates(self):
        for value in (None, "", "unknown", "Unknown", "Uncalibrated", "9999-99-99",
                      "2025-02-29", "2026-04-31", "0000-01-01", "2026-1-15",
                      "2026-01-15T00:00:00", 20260115):
            with self.subTest(value=value):
                self.assertTrue(self.errors(value))

    def test_declaration_remains_required(self):
        device = dict(self.device)
        del device["device_calibration_date"]
        self.assertTrue(glc_validator.validate_against_json_schema([device], str(SCHEMA), "devices"))

    def test_historical_schema_still_rejects_uncalibrated(self):
        for version in ("3.0.1", "3.0.2", "3.1.0"):
            with self.subTest(version=version):
                device = {**self.device, "schema_version": version, "device_calibration_date": "uncalibrated"}
                self.assertTrue(glc_validator.validate_against_json_schema(
                    [device], str(ROOT / "schemas" / version / "device.schema.json"), "devices"))

    def validate_package(self, value="2026-01-15", metadata_only=False):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            package = directory / "package"
            shutil.copytree(FIXTURE, package)
            path = package / "data/devices.json"
            devices = json.loads(path.read_text())
            devices[0]["device_calibration_date"] = value
            path.write_text(json.dumps(devices))
            if metadata_only:
                path = package / "data/datasets.json"
                records = json.loads(path.read_text())
                for record in records:
                    record.pop("dataset_file", None)
                    record.pop("dataset_variable_terms", None)
                path.write_text(json.dumps(records))
            report_path = directory / "validation.json"
            environment = {"VALIDATION_JSON": str(report_path),
                           "VALIDATION_MANIFEST": str(directory / "manifest.json")}
            with patch.dict(os.environ, environment, clear=False):
                with contextlib.redirect_stdout(io.StringIO()):
                    code = glc_validator.validate_crossrefs(str(package / "datapackage.json"))
            return code, json.loads(report_path.read_text()), report_path.with_suffix(".html").read_text(), devices[0]["device_internal_id"]

    def test_dated_package_passes_without_calibration_warning(self):
        code, report, _, _ = self.validate_package()
        self.assertEqual(code, 0, report["errors"])
        self.assertEqual(report["schema_version"], "3.2.0")
        self.assertEqual(report["validation_scope"], "metadata_and_data")
        self.assertFalse(any(w["type"] == "uncalibrated_devices" for w in report["warnings"]))

    def test_uncalibrated_passes_with_one_warning_in_json_and_html(self):
        code, report, html, device_id = self.validate_package("uncalibrated")
        self.assertEqual(code, 0, report["errors"])
        self.assertEqual(report["status"], "pass")
        warnings = [w for w in report["warnings"] if w["type"] == "uncalibrated_devices"]
        self.assertEqual(len(warnings), 1)
        expected = (f"Device {device_id} is declared uncalibrated. No applicable calibration date was supplied. "
                    "Under GLC policy, this includes devices whose calibration records are unavailable. "
                    "Consider this limitation when assessing measurement accuracy.")
        self.assertEqual(warnings[0]["message"], expected)
        self.assertIn(expected, html)
        self.assertIn({"type": "uncalibrated_devices", "label": "Uncalibrated devices", "count": 1}, report["warning_groups"])
        self.assertEqual(report["warning_count"], len(report["warnings"]))

    def test_metadata_only_uncalibrated_package_passes_with_warning(self):
        code, report, _, _ = self.validate_package("uncalibrated", metadata_only=True)
        self.assertEqual(code, 0, report["errors"])
        self.assertEqual(report["validation_scope"], "metadata_only")
        self.assertTrue(any(w["type"] == "uncalibrated_devices" for w in report["warnings"]))

    def test_invalid_calendar_date_fails_metadata_checks(self):
        code, report, _, _ = self.validate_package("9999-99-99")
        self.assertNotEqual(code, 0)
        self.assertEqual(report["status"], "fail")
        self.assertTrue(any("device_calibration_date" in str(e["path"]) for e in report["errors"]))

    def test_warning_handles_object_and_skips_missing_and_invalid_rows(self):
        uncalibrated = {**self.device, "device_calibration_date": "uncalibrated"}
        self.assertEqual(len(glc_validator.warn_uncalibrated_devices(uncalibrated)), 1)
        self.assertEqual(glc_validator.warn_uncalibrated_devices([None, {}, self.device]), [])


if __name__ == "__main__":
    unittest.main()
