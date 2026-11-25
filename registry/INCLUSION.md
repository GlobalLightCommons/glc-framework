# Registry inclusion review

GLC prioritises openly shared recordings. Metadata-only entries are accepted
where ethical, consent-related or legal constraints prevent public sharing.
They support discovery but do not provide openly reusable recordings.

All contributors edit [datasets.yml](datasets.yml), not generated registry JSON.
Packages containing recordings need no additional justification template.
Only metadata-only submissions also use the
[metadata-only template](../.github/PULL_REQUEST_TEMPLATE/metadata-only-inclusion.md)
in the pull-request description.
For each metadata-only package, the `## Metadata-only justification` section
must contain a `### owner/repository` heading and a short explanation below it.
Comments and common placeholders do not count. Maintainers assess the explanation.

The [PR verification workflow](../.github/workflows/validate-datasets.yml) runs
on opening, code updates, reopening, description edits and readiness for review.
It verifies evidence for new or target-changed entries, derives scope from the
verified report, and requires a justification for metadata-only entries. Reports
without scope must be regenerated for those entries. Unchanged entries rechecked
solely because trust logic changed do not need new inclusion justifications.
Unrelated PRs do not require this template or a justification. Manual dispatch
verifies evidence without requiring a PR description.

## Deployment and merge enforcement

The proposed [main-branch ruleset](main-ruleset.json) is initially disabled to
avoid blocking the rollout before the workflow exists on the default branch.
It has been saved in [GitHub repository settings](https://github.com/GlobalLightCommons/glc-framework/settings/rules/27999282).
It requires an approving review and the registry check for all main-branch PRs.
An approving reviewer must have the appropriate repository permissions; the
maintainer team remains responsible for applying the inclusion policy.

1. Merge the template, workflow, checker and guide into the default branch.
2. Run the workflow on a pull request so GitHub registers the check.
3. In repository Settings, activate the proposed ruleset for `main`:
   require **Registry inclusion checks** to pass and require a maintainer's
   approving review before merging. Restrict bypasses to the repository's
   agreed maintainer policy. These settings are separate from the workflow file.
4. Verify that a metadata-only request without an explanation is blocked, an
   edited description triggers another run, and an acceptable explanation still
   requires human approval.

There is deliberately no path filter on this required check: unrelated PRs
complete it successfully rather than leaving a required check pending.
No PR text is interpolated into shell commands and no write permissions or
automatic PR comments are needed. The tailored errors appear in the job's log
and GitHub Actions summary. No automated check can establish the truth or
adequacy of an ethical or legal explanation.
