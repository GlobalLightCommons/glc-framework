import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from validate_datasets_pr import check_validation_status, dataset_entries_requiring_verification


class TrustRecheckTests(unittest.TestCase):
    def test_unchanged_failure_can_be_reauthenticated(self):
        check_validation_status("fail", "registry trust logic changed")

    def test_new_and_changed_targets_still_require_a_pass_during_trust_rechecks(self):
        base = {"datasets": [{"repo": "owner/unchanged"}, {"repo": "owner/changed", "branch": "main"}]}
        current = [{"repo": "owner/unchanged"}, {"repo": "owner/changed", "branch": "release"}, {"repo": "owner/new"}]
        selected = dataset_entries_requiring_verification(current, base, force_all=True)
        self.assertEqual([reason for _, reason in selected], [
            "registry trust logic changed", "validation target changed", "new dataset entry"
        ])
        for _, reason in selected[1:]:
            with self.assertRaises(RuntimeError):
                check_validation_status("fail", reason)
            check_validation_status("pass", reason)

    def test_missing_base_does_not_allow_a_failed_report(self):
        selected = dataset_entries_requiring_verification([{"repo": "owner/dataset"}], None, force_all=True)
        with self.assertRaises(RuntimeError):
            check_validation_status("fail", selected[0][1])

    def test_unknown_or_missing_status_is_never_accepted(self):
        for status in (None, "unknown", "unverified", ""):
            with self.assertRaises(RuntimeError):
                check_validation_status(status, "registry trust logic changed")


if __name__ == "__main__":
    unittest.main()
