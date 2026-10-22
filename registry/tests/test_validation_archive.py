import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import validation_artifacts as artifacts
from fetch_registry import main as fetch_main


class ValidationArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.sha = "a" * 40
        self.repo = "example/dataset"
        self.env = patch.dict(os.environ, {"VALIDATION_ARCHIVE_DIR": str(self.root / "archive")})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.report = {
            "repo": self.repo, "commit_sha": self.sha, "status": "pass",
            "validator_image": "ghcr.io/tscnlab/glc-validator@sha256:abc",
            "timestamp_utc": "2026-09-22T12:00:00Z", "schema_version": "3.0.2",
        }
        self.manifest = {"repo": self.repo, "commit_sha": self.sha, "files": []}
        self.report_path = self.root / "validation.json"
        self.manifest_path = self.root / "validated-files-manifest.json"
        self.report_path.write_text(json.dumps(self.report))
        self.manifest_path.write_text(json.dumps(self.manifest))
        self.info = {"run": {"id": 1, "html_url": "https://github.com/example/dataset/actions/runs/1"}, "artifact": {"id": 2}}
        self.policy = next(p for p in artifacts.TRUSTED_VALIDATOR_POLICIES if p["id"] == "current_glc")

    def export_bundle(self, path, repo, destination):
        # Test double for signed evidence. Signature verification itself is delegated to gh.
        destination.write_text(hashlib.sha256(Path(path).read_bytes()).hexdigest())

    def check_bundle(self, path, repo, sha, policy, bundle_path=None):
        self.assertIsNotNone(bundle_path)
        if Path(bundle_path).read_text() != hashlib.sha256(Path(path).read_bytes()).hexdigest():
            raise RuntimeError("artifact bytes do not match bundle")
        return [{"verified": True}]

    def save(self):
        with patch.object(artifacts, "download_attestation_bundle", side_effect=self.export_bundle), patch.object(artifacts, "verify_attestation", side_effect=self.check_bundle):
            artifacts.archive_verified_result(self.repo, self.sha, self.info, self.report_path, self.manifest_path, self.policy)

    def test_expired_actions_artifacts_still_produce_verified_registry_entry(self):
        self.save()
        config = self.root / "datasets.yml"
        config.write_text(f"datasets:\n  - repo: {self.repo}\n    name: Example\n")
        output = self.root / "output"
        with patch.object(artifacts, "verify_attestation", side_effect=self.check_bundle), patch("fetch_registry.resolve_repository", return_value=self.repo), patch("fetch_registry.get_commit_sha", return_value=self.sha), patch("fetch_registry.find_validation_artifact", return_value=None), patch.object(sys, "argv", ["fetch_registry.py", str(config), str(output)]):
            self.assertEqual(fetch_main(), 0)
        dataset = json.loads((output / "registry.json").read_text())["datasets"][0]
        self.assertTrue(dataset["attestation_verified"])
        self.assertEqual(dataset["current_status"], "pass")
        self.assertEqual(dataset["current"]["verification_source"], "archive")
        self.assertEqual(dataset["fetch_errors"], [])

    def test_tampered_report_is_rejected_even_when_archive_says_it_passed(self):
        self.save()
        report = next((self.root / "archive").rglob("validation.json"))
        report.write_text(report.read_text() + " ")
        with patch.object(artifacts, "verify_attestation", side_effect=self.check_bundle):
            with self.assertRaisesRegex(RuntimeError, "could not be verified"):
                artifacts.archived_result(self.repo, self.sha)

    def test_archive_never_supplies_evidence_for_another_commit(self):
        self.save()
        self.assertIsNone(artifacts.archived_result(self.repo, "b" * 40))
        with self.assertRaisesRegex(RuntimeError, "Invalid archive"):
            artifacts.archived_result("../dataset", self.sha)

    def test_missing_manifest_bundle_is_rejected(self):
        self.save()
        next((self.root / "archive").rglob("manifest.bundle.jsonl")).unlink()
        with patch.object(artifacts, "verify_attestation", side_effect=self.check_bundle):
            with self.assertRaisesRegex(RuntimeError, "could not be verified"):
                artifacts.archived_result(self.repo, self.sha)

    def test_revalidation_appends_evidence_without_replacing_old_report(self):
        self.save()
        self.report["timestamp_utc"] = "2026-10-22T12:00:00Z"
        self.report_path.write_text(json.dumps(self.report))
        self.save()
        self.assertEqual(len(list((self.root / "archive").rglob("validation.json"))), 2)
        with patch.object(artifacts, "verify_attestation", side_effect=self.check_bundle):
            result = artifacts.archived_result(self.repo, self.sha)
        self.assertEqual(result["validation"]["timestamp_utc"], "2026-10-22T12:00:00Z")

    @patch("validation_artifacts.subprocess.run")
    @patch("validation_artifacts.shutil.which", return_value="/usr/bin/gh")
    def test_offline_bundle_keeps_commit_and_signer_constraints(self, which, run):
        run.return_value.returncode = 0
        run.return_value.stdout = "[]"
        artifacts.verify_attestation(self.report_path, self.repo, self.sha, self.policy, self.root / "bundle.jsonl")
        command = run.call_args.args[0]
        self.assertEqual(command[command.index("--source-digest") + 1], self.sha)
        self.assertEqual(command[command.index("--repo") + 1], self.repo)
        self.assertEqual(command[command.index("--signer-workflow") + 1], self.policy["signer_workflow"])
        self.assertEqual(command[command.index("--bundle") + 1], str(self.root / "bundle.jsonl"))
        self.assertIn("--deny-self-hosted-runners", command)


if __name__ == "__main__":
    unittest.main()
