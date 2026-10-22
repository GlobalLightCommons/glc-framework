# Schema 3.0.1 corrective-release checklist

Schema 3.0.1 is a corrective patch release. The published 3.0.0 schema bundle
remains unchanged and supported so earlier validation results remain
reproducible. New and migrated packages should use 3.0.1 after release.

The broader schema 3 data model and user-facing interpretation remain
documented in
[schema-3.0.1-dataset-guidance.md](schema-3.0.1-dataset-guidance.md).

## Corrections included in 3.0.1

- [x] Require `device_calibration_date`, reject `null`, and require
  `YYYY-MM-DD`, matching the published BMC metadata descriptor.
- [x] Require `dataset_crossref_participant_id` for participant-associated
  datasets and require it to be omitted for non-participant datasets.
- [x] Make contributor ORCID optional.
- [x] Make unavailable optional metadata omissible and reject explicit `null`
  where omission is the agreed convention.
- [x] Make the unavailable device-datasheet spectral-sensitivity, linearity,
  and directional-response fields optional.
- [x] Add schema examples and validator-specific constraint annotations for
  human-readable documentation.
- [x] Report short and long tabular rows as aggregated warnings rather than
  failing validation; missing trailing cells are treated as empty and surplus
  cells are ignored.

## Validator work

- [x] Restore `schemas/3.0.0/` exactly as published in validator v0.5.0.
- [x] Add the corrected canonical bundle under `schemas/3.0.1/`.
- [x] Support both 3.0.0 and 3.0.1 profile names and schema-specific behavior.
- [x] Retarget the corrective schema 3 tests and comprehensive fixture to
  3.0.1.
- [x] Add a regression test proving the published 3.0.0 fixture remains
  supported.
- [ ] Run the complete automated validator suite.
- [ ] Validate the migrated MeLiDos IZTECH package end to end.

## Coordinated repository work

- [x] Update the metadata builder to create 3.0.1 packages and stop offering
  3.0.0 for new package creation.
- [x] Update the viewer documentation, downloads, examples, and validation
  guide from 3.0.0 to 3.0.1.
- [ ] Migrate and revalidate the MeLiDos IZTECH package as 3.0.1.
- [ ] Set the registry's current schema version to 3.0.1 while retaining
  historical 3.0.0 results.

## Application release work

- [x] Increment the validator application version to 0.5.1.
- [x] Build and test the 0.5.1 release-candidate container image locally.
- [ ] Update the dataset workflow template to use the 0.5.1 reusable workflow.
- [x] Publish `ghcr.io/tscnlab/glc-validator:0.5.1`.
- [x] Pin the released multi-platform image digest in the reusable workflow (`sha256:8e2397f65aa82eaa960d2f8f53aed2bb9fdb623e2bec5dbe15df22c17a658877`).
- [ ] Tag and publish validator release v0.5.1.
- [ ] Run validation, attestation, registry-ingestion, viewer, and
  LightLogWeb handoff checks.
