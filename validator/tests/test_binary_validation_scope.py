"""Package-level scope must follow declarations, never missing recording bytes."""
import contextlib
import copy
import io
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import glc_validator


FIXTURE = Path(__file__).parent / "fixtures/schema-3.1.0/pass"


class BinaryValidationScopeTests(unittest.TestCase):
    def run_package(self, mutate=None):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "package"
            shutil.copytree(FIXTURE, root)
            datasets_path = root / "data/datasets.json"
            datasets = json.loads(datasets_path.read_text())
            if mutate:
                mutate(root, datasets)
            datasets_path.write_text(json.dumps(datasets))
            report_path = Path(directory) / "validation.json"
            manifest_path = Path(directory) / "manifest.json"
            with patch.dict(os.environ, {"VALIDATION_JSON": str(report_path), "VALIDATION_MANIFEST": str(manifest_path)}):
                with contextlib.redirect_stdout(io.StringIO()):
                    code = glc_validator.validate_crossrefs(str(root / "datapackage.json"))
            return code, json.loads(report_path.read_text()), json.loads(manifest_path.read_text()), report_path.with_suffix(".html").read_text()

    @staticmethod
    def metadata_only(root, datasets):
        for dataset in datasets:
            dataset.pop("dataset_file", None)
            dataset.pop("dataset_variable_terms", None)

    def test_metadata_only_has_no_recording_claims_or_hashes(self):
        code, report, manifest, rendered = self.run_package(self.metadata_only)
        self.assertEqual(code, 0, report["errors"])
        self.assertEqual(report["validation_scope"], "metadata_only")
        self.assertEqual(report["coverage"]["metadata"], "pass")
        self.assertEqual(report["coverage"]["recordings"], "not_assessed")
        # Fixture recording remains on disk: undeclared recordings are not scanned.
        self.assertFalse(any(item["path"] == "data/datasets/light.csv" for item in manifest["files"]))
        self.assertIn("not_assessed", rendered)

    def test_complete_package_runs_recording_checks(self):
        code, report, manifest, _ = self.run_package()
        self.assertEqual(code, 0, report["errors"])
        self.assertEqual(report["validation_scope"], "metadata_and_data")
        self.assertEqual(report["coverage"]["recordings"], "pass")
        self.assertTrue(all(item["outcome"] == "pass" for item in report["coverage"]["files"]))
        self.assertTrue(any(item["path"] == "data/datasets/light.csv" and item["sha256"] for item in manifest["files"]))

    def test_all_declared_files_absent_is_error(self):
        def mutate(root, datasets):
            shutil.rmtree(root / "data/datasets")
        code, report, manifest, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        self.assertEqual(report["validation_scope"], "metadata_and_data")
        self.assertEqual(report["coverage"]["present_file_count"], 0)
        self.assertTrue(any("Declared recordings are required" in error["message"] for error in report["errors"]))
        self.assertTrue(any(not item["exists"] and not item["sha256"] for item in manifest["files"] if item["required"]))

    def test_partial_presence_fails_before_any_recording_checks(self):
        def mutate(root, datasets):
            datasets[0]["dataset_file"][0]["dataset_file_names"].append("data/datasets/missing.csv")
        code, report, _, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        self.assertEqual(report["coverage"]["recordings"], "not_assessed")
        outcomes = {item["path"]: item["outcome"] for item in report["coverage"]["files"]}
        self.assertEqual(outcomes["data/datasets/light.csv"], "not_assessed")
        self.assertEqual(outcomes["data/datasets/missing.csv"], "missing")

    def test_some_datasets_can_omit_recording_lists_if_all_listed_files_exist(self):
        def mutate(root, datasets):
            second = copy.deepcopy(datasets[0])
            second["dataset_internal_id"] = "DS_METADATA"
            second.pop("dataset_file")
            second.pop("dataset_variable_terms")
            datasets.append(second)
        code, report, _, _ = self.run_package(mutate)
        self.assertEqual(code, 0, report["errors"])
        self.assertEqual(report["validation_scope"], "metadata_and_data")
        self.assertEqual(report["coverage"]["datasets_with_files"], 1)
        self.assertEqual(report["coverage"]["datasets_without_files"], 1)
        self.assertEqual(report["coverage"]["recordings"], "pass")

    def test_metadata_errors_prevent_scope_claims_and_recording_checks(self):
        def mutate(root, datasets):
            datasets[0]["dataset_timezone"] = "Invalid/Zone"
        code, report, manifest, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        self.assertEqual(report["coverage"]["metadata"], "fail")
        self.assertEqual(report["coverage"]["recordings"], "not_assessed")
        self.assertEqual(report["validation_scope"], "not_determined")
        self.assertTrue(any(item["path"] == "data/datasets/light.csv" and item["sha256"] for item in manifest["files"]))

    def test_present_but_invalid_recording_fails_and_is_hashed(self):
        def mutate(root, datasets):
            (root / "data/datasets/light.csv").write_text("timestamp,illuminance\ninvalid,abc\n")
        code, report, manifest, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        self.assertEqual(report["coverage"]["recordings"], "fail")
        self.assertTrue(any(item["outcome"] == "fail" for item in report["coverage"]["files"]))
        self.assertTrue(any(item["path"] == "data/datasets/light.csv" and item["sha256"] for item in manifest["files"]))

    def test_directory_is_not_a_recording_file(self):
        def mutate(root, datasets):
            datasets[0]["dataset_file"][0]["dataset_file_names"] = ["data/datasets"]
        code, report, _, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        self.assertTrue(any("not a regular file" in error["message"] for error in report["errors"]))

    def test_empty_recording_list_is_metadata_only_without_variable_vocabulary(self):
        def mutate(root, datasets):
            for dataset in datasets:
                dataset["dataset_file"] = []
                dataset.pop("dataset_variable_terms", None)
        code, report, _, _ = self.run_package(mutate)
        self.assertEqual(code, 0, report["errors"])
        self.assertEqual(report["validation_scope"], "metadata_only")
        self.assertEqual(report["coverage"]["metadata"], "pass")

    def test_placeholder_group_is_not_an_empty_recording_list(self):
        code, report, _, _ = self.run_package(lambda root, datasets: datasets[0].update(dataset_file=[{}]))
        self.assertEqual(code, 1)
        self.assertEqual(report["coverage"]["metadata"], "fail")

    def test_nonempty_groups_still_require_variable_vocabulary(self):
        code, report, _, _ = self.run_package(lambda root, datasets: datasets[0].pop("dataset_variable_terms"))
        self.assertEqual(code, 1)
        self.assertTrue(any("dataset_variable_terms" in error["message"] for error in report["errors"]))

    def test_metadata_only_still_requires_core_metadata(self):
        def mutate(root, datasets):
            self.metadata_only(root, datasets)
            (root / "data/participants.csv").unlink()
        code, report, _, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        self.assertEqual(report["coverage"]["metadata"], "fail")

    def test_individual_file_outcomes_differ_within_group(self):
        def mutate(root, datasets):
            datasets[0]["dataset_file"][0]["dataset_file_names"].append("data/datasets/bad.csv")
            (root / "data/datasets/bad.csv").write_text("timestamp,illuminance\n2026-07-14 08:00:00,wrong\n")
        code, report, _, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        outcomes = {item["path"]: item["outcome"] for item in report["coverage"]["files"]}
        self.assertEqual(outcomes["data/datasets/light.csv"], "pass")
        self.assertEqual(outcomes["data/datasets/bad.csv"], "fail")

    def test_metadata_directory_members_are_fingerprinted(self):
        def mutate(root, datasets):
            descriptor_path = root / "datapackage.json"
            descriptor = json.loads(descriptor_path.read_text())
            study = next(resource for resource in descriptor["resources"] if resource["name"] == "study")
            original = root / study["path"]
            folder = root / "study_metadata"
            folder.mkdir()
            study_value = json.loads(original.read_text())
            (folder / "study.json").write_text(json.dumps(study_value[0]))
            study["path"] = "study_metadata"
            descriptor_path.write_text(json.dumps(descriptor))
        code, report, manifest, _ = self.run_package(mutate)
        self.assertEqual(code, 0, report["errors"])
        self.assertTrue(any(item["path"] == "study_metadata/study.json" and item["sha256"] for item in manifest["files"]))

    def test_html_escapes_contributor_content(self):
        def mutate(root, datasets):
            datasets[0]["dataset_file"][0]["dataset_file_names"] = ["<script>alert(1)</script>.csv"]
        _, _, _, rendered = self.run_package(mutate)
        self.assertNotIn("<script>", rendered)
        self.assertIn("&lt;script&gt;", rendered)

    def test_collection_timestamp_and_factor_uniqueness_are_metadata_checks(self):
        errors = glc_validator.validate_recording_metadata([{"dataset_file": [{
            "dataset_file_datetime": {"dataset_file_datetime_source": "collection", "dataset_file_datetime_date": "2026-99-01", "dataset_file_datetime_dateformat": "YYYY-MM-DD"},
            "dataset_file_variables": [{"dataset_file_variables_type": "factor", "dataset_file_variables_factor_levels": [{"value": "a"}, {"value": "a"}]}],
        }]}])
        self.assertEqual(len(errors), 2)

    def test_warning_groups_count_all_instances_including_empty_values(self):
        warnings = [
            {"message": "column a contains 1/1 empty values"},
            {"message": "column b contains 2/3 empty values"},
            {"message": "file has undeclared extra columns: x"},
        ]
        groups = {group["type"]: group["count"] for group in glc_validator.summarize_warnings(warnings)}
        self.assertEqual(groups, {"empty_values": 2, "extra_columns": 1})
        self.assertEqual(sum(groups.values()), len(warnings))

    def test_explicit_additional_resource_without_schema_fails_metadata(self):
        def mutate(root, datasets):
            descriptor_path = root / "datapackage.json"
            descriptor = json.loads(descriptor_path.read_text())
            descriptor["resources"].append({
                "name": "extra_results", "path": "data/extra.csv",
                "profile": "tabular-data-resource", "format": "csv", "mediatype": "text/csv",
            })
            descriptor_path.write_text(json.dumps(descriptor))
            (root / "data/extra.csv").write_text("value\n1\n")
        code, report, _, _ = self.run_package(mutate)
        self.assertEqual(code, 1)
        self.assertEqual(report["coverage"]["metadata"], "fail")
        self.assertTrue(any('requires "schema"' in error["message"] or "Missing required schema" in error["message"]
                            for error in report["errors"]), report["errors"])
        self.assertFalse(any("resource not validated" in warning["message"] for warning in report["warnings"]))


if __name__ == "__main__":
    unittest.main()
