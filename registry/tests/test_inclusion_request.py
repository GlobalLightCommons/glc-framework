import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from validate_datasets_pr import inclusion_policy_error, justification_for, pull_request_body, main


class InclusionRequestTests(unittest.TestCase):
    def body(self, reason):
        return f"## Metadata-only justification\n\n### lab/study\n\n{reason}\n\n## Other information\nUnrelated text"

    def test_missing_empty_and_placeholder_explanations_fail(self):
        template = (Path(__file__).resolve().parents[2] /
                    ".github/PULL_REQUEST_TEMPLATE/metadata-only-inclusion.md").read_text()
        for body in [None, "", "Unrelated text", template,
                     template.replace("owner/repository", "lab/study"),
                     *[self.body(text) for text in ["", "<!-- Reason here -->", "...", "TBD", "N/A"]]]:
            with self.subTest(body=body):
                self.assertIn("Please explain why", inclusion_policy_error(
                    {"validation_scope": "metadata_only"}, body, "lab/study"))

    def test_real_explanation_passes(self):
        body = self.body("Participant consent does not permit public release of recordings.")
        self.assertIsNone(inclusion_policy_error(
            {"validation_scope": "metadata_only"}, body, "lab/study"))

    def test_explanation_is_required_for_each_repository(self):
        body = self.body("Consent limits public sharing.")
        self.assertFalse(justification_for(body, "lab/another-study"))
        body = body.replace("## Other information", "### lab/another-study\nLegal restrictions prevent release.\n\n## Other information")
        self.assertTrue(justification_for(body, "lab/another-study"))

    def test_other_section_cannot_supply_justification(self):
        self.assertFalse(justification_for(self.body(""), "lab/study"))

    def test_public_recordings_need_no_justification(self):
        self.assertIsNone(inclusion_policy_error(
            {"validation_scope": "metadata_and_data"}, "", "lab/study"))

    def test_unknown_scope_requires_revalidation(self):
        self.assertIn("Rerun validation", inclusion_policy_error({}, "", "lab/study"))

    def test_event_body_is_read_as_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            event = Path(tmp) / "event.json"
            body = self.body("Consent prevents release. $(do-not-execute)")
            event.write_text(json.dumps({"pull_request": {"body": body}}))
            with patch.dict(os.environ, {"GITHUB_EVENT_PATH": str(event)}):
                self.assertEqual(pull_request_body(), body)
            event.write_text(json.dumps({"pull_request": {"body": None}}))
            with patch.dict(os.environ, {"GITHUB_EVENT_PATH": str(event)}):
                self.assertEqual(pull_request_body(), "")
            event.write_text("{}")
            with patch.dict(os.environ, {"GITHUB_EVENT_PATH": str(event)}):
                self.assertIsNone(pull_request_body())

    def test_main_enforces_policy_after_verifying_evidence(self):
        dataset = {"name": "Example", "repo": "lab/study"}
        cfg = {"current_schema_version": "3.1.0", "datasets": [dataset]}
        for reason, expected_failure in [("", True), ("Consent prevents public release.", False)]:
            with self.subTest(reason=reason), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp).resolve()
                with patch("validate_datasets_pr.load_cfg", return_value=cfg), \
                     patch("validate_datasets_pr.subprocess.check_output", return_value=str(root)), \
                     patch("validate_datasets_pr.load_base_cfg", return_value={"datasets": []}), \
                     patch("validate_datasets_pr.trust_logic_changed", return_value=False), \
                     patch("validate_datasets_pr.pull_request_body", return_value=self.body(reason)), \
                     patch("validate_datasets_pr.get_commit_sha", return_value="a" * 40), \
                     patch("validate_datasets_pr.find_validation_artifact", return_value={"id": 1}), \
                     patch("validate_datasets_pr.verify_validation_artifact", return_value={
                         "validation": {"status": "pass", "validation_scope": "metadata_only"}
                     }) as verify, \
                     patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(root / "summary.md")}):
                    if expected_failure:
                        with self.assertRaises(SystemExit):
                            main(str(root / "datasets.yml"))
                        self.assertIn("Please explain why", (root / "summary.md").read_text())
                    else:
                        main(str(root / "datasets.yml"))
                    verify.assert_called_once()


if __name__ == "__main__":
    unittest.main()
