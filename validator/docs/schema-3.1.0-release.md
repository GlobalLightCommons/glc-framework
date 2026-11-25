# GLC schema 3.1.0

GLC schema 3.1.0 adds optional metadata and metadata-only submission support to 3.0.2. Published schema bundles,
including 3.0.2, remain unchanged and supported for reproducibility.

## Recording duration and contiguity

Dataset metadata may include `dataset_recording_duration`,
`dataset_recording_duration_unit`, and `dataset_recording_contiguity`.
Supply all three together or omit all three. Duration is a positive number in
`second`, `minute`, `hour`, `day`, or `week` units and counts cumulative usable
data, excluding gaps and invalid recordings. Two usable two-week seasonal
sessions are `4` `week`, with contiguity `noncontiguous`.

Contiguity is `contiguous` or `noncontiguous` and describes recording sessions.
Ordinary missing samples within a session do not break contiguity. Explain
session timing in `dataset_file_description`, or `study_short_description`
when applicable across the study.

## Study summary statistics

Study metadata support optional repeatable `summary_statistics`, including
whole-study results and results for exactly one named study group. The validator
checks structure and group references without recalculating results. See
[field definitions and examples](summary-statistics.md).

## Compatibility and release

### Binary validation scope

The five required public metadata resources remain mandatory. Dataset records
may omit `dataset_file` for metadata-only submission. The file-group vocabulary
`dataset_variable_terms` is required when `dataset_file` contains groups, and may
be omitted otherwise. An empty `dataset_file: []` is equivalent to omitting it.
Placeholder groups such as `[{}]` remain invalid: supplied groups need complete
metadata, not just a filename.

Dataset records may omit recording lists even when other records list files.
Recording validation covers those listed files only; the report counts records
with and without recording lists. Every listed recording must exist, including
when none of the listed recordings are present. Missing listed files fail;
missing files never cause automatic metadata-only acceptance. A directory is
not a recording file, and an unreadable or invalid recording fails data checks.

The validator derives `validation_scope` (`metadata_only`, `metadata_and_data`,
or `not_determined` when metadata cannot be validated) in its generated report.
No access tiers or validation-mode fields are written into submitted metadata.
Metadata checks run first; data checks run only when metadata and file-presence
checks pass. Other, undeclared repository files are not scanned for recordings.
Explicitly declared additional resources retain their normal validation rules.

`validation.json` records scope, counts, outcomes and warnings. Its sibling
`validation.html` renders those results and the submitted-file inventory.
`validated-files-manifest.json` fingerprints available declared package files,
even when their checks fail or never start; hashes do not imply successful
validation. JSON metadata directories are expanded using the loader's `*.json`
selection. Missing declared files remain in the manifest without hashes.

The registry displays an orange Metadata only badge for lower coverage and
keeps pass/fail separate. A warning count expands to the messages for that same
verified run. Historical reports without scope remain unclassified until rerun.
Warnings are grouped by type and instance count without excluding empty-value
notices. Missing schemas on explicitly declared additional resources are errors
under the 3.1.0 profile, not merely notices about skipped checks.
The validator does not compare observed sampling intervals, recalculate usable
duration or summary statistics, or establish scientific accuracy.

The builder creates 3.1.0 packages and upgrades imported older packages and
builder drafts to its current workflow. The validator continues to validate
older packages against their original versioned schemas. Existing validation
evidence remains tied to the dataset commit, schema version, and validator
version recorded in the report. The registry treats 3.0.2 and earlier schemas
as legacy; this does not turn a previous passing validation into a failure.

Duration and summary statistics are optional. Existing metadata that omit them need no new
fields when preparing a 3.1.0 package, though its schema version and schema
references must be updated together.

Publish validator 0.6.0 as a new image before using
3.1.0 in production validation. Then update the pinned image digest in the
validation workflow. The existing image pin remains unchanged until that image
is available; committing schema changes alone does not publish a validator.
