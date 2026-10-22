import contextlib
import io
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

import glc_validator


FIXTURE_ROOT = os.path.join(
    os.path.dirname(__file__),
    "fixtures",
    "schema-3.0.0",
    "pass",
)


class HistoricalSchema300FixtureTests(unittest.TestCase):
    def test_published_schema_3_0_0_fixture_remains_supported(self):
        with tempfile.TemporaryDirectory() as directory:
            package_root = os.path.join(directory, "package")
            shutil.copytree(FIXTURE_ROOT, package_root)
            report_path = os.path.join(directory, "validation.json")
            manifest_path = os.path.join(directory, "manifest.json")
            environment = {
                "VALIDATION_JSON": report_path,
                "VALIDATION_MANIFEST": manifest_path,
            }
            with patch.dict(os.environ, environment, clear=False):
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = glc_validator.validate_crossrefs(
                        os.path.join(package_root, "datapackage.json")
                    )

            with open(report_path, encoding="utf-8") as report_file:
                report = json.load(report_file)

            self.assertEqual(exit_code, 0, report["errors"])
            self.assertEqual(report["status"], "pass")
            self.assertEqual(report["schema_version"], "3.0.0")


if __name__ == "__main__":
    unittest.main()
