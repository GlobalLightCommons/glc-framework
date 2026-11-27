# GLC metadata validator

<img src="assets/GLC_Logo.png" alt="Global Light Commons logo" width="320">

This repository contains the GLC metadata validator for GLC Frictionless data packages. It provides the canonical schema bundle and Dockerized validation script used to check that a metadata repository is complete, internally consistent, and compatible with the supported GLC schema versions.

## What is included

- `glc_validator.py`: the Python validator entrypoint.
- `Dockerfile`: a containerized runtime for running validation consistently in local development and CI.
- `requirements.txt`: pinned Python dependencies used by the validator.
- `VERSION`: the validator release version.
- `schemas/1.0.0/`, `schemas/2.0.0/`, `schemas/3.0.0/`, `schemas/3.0.1/`, `schemas/3.0.2/`, `schemas/3.1.0/`, and `schemas/3.2.0/`: supported GLC schema bundles, including the Frictionless data package profile and JSON/Table Schema files for core resources.
- `docs/schema-3.0.1-development.md`: the corrective-release checklist for coordinating schema, validator, builder, viewer, and dataset changes.
- `.github/workflows/validate.yml`: a reusable trusted validation workflow that runs the validator container, uploads reports, and attests the validation outputs.
- `templates/github-actions/validate-glc-dataset.yml`: a ready-to-copy caller workflow for dataset repositories.

The validator currently checks:

- The top-level `datapackage.json` against the canonical GLC profile.
- Required core resources: `study`, `participants`, `datasets`, `devices`, and `device_datasheets`.
- Optional core resource: `participant_characteristics`.
- JSON resources against bundled JSON Schemas.
- Tabular resources against bundled Table Schemas.
- Cross-resource links such as participant, study, dataset, device, and datasheet IDs.
- Dataset file metadata against the referenced data files when metadata validation passes.
- SHA-256 checksums for files referenced by `datapackage.json` and `datasets.json`.

## Requirements

Users who want to run GLC validation locally need Docker installed and available on the command line. In GitHub Actions, Docker is already available on the hosted Ubuntu runners used by the workflow template.

You do not need to install Python dependencies into each dataset repository. Add the GitHub Actions workflow template to the repository you want to validate, or run the validator container locally from that repository.

## Build a metadata package

Use the [GLC metadata builder](https://builder.globallightcommons.org/) to create a metadata package that follows this schema. The builder helps assemble the required `datapackage.json` and core metadata resources before you run validation.

After exporting or committing the generated metadata package, run this validator from the package repository to check the exported files against the canonical GLC schemas.

## Run locally

Build the validator image from this repository:

```sh
docker build -t glc-metadata-validator .
```

From the root of a metadata repository that contains `datapackage.json`, run:

```sh
docker run --rm -v "$PWD":/data -w /data glc-metadata-validator datapackage.json
```

The command exits with:

- `0` when validation passes.
- `1` when validation fails.

A JSON report is written to:

```text
validation_out/validation.json
```

The validator also writes a checksum manifest:

```text
validation_out/validated-files-manifest.json
```

To write the report somewhere else, set `VALIDATION_JSON`:

```sh
docker run --rm \
  -e VALIDATION_JSON=reports/glc-validation.json \
  -v "$PWD":/data \
  -w /data \
  glc-metadata-validator datapackage.json
```

## Add validation to a metadata repository

For routine GLC validation, copy the caller workflow template from this repository into the dataset or metadata repository you want to validate:

```text
templates/github-actions/validate-glc-dataset.yml
```

Place it at:

```text
.github/workflows/validate-glc-dataset.yml
```

The workflow runs on pushes to `main`, pull requests, and manual dispatch. It calls the trusted reusable workflow in this repository instead of duplicating validation logic in each dataset repository.

The reusable workflow:

- checks out the dataset repository with Git LFS enabled
- pulls the published validator image
- records the resolved validator image digest in `validation.json`
- writes `validation_out/validation.json`
- writes `validation_out/validated-files-manifest.json`
- uploads `validation_out/` as the `validation-report` GitHub Actions artifact
- attests `validation.json` and `validated-files-manifest.json`

Registry automation should verify the attested `validation-report` artifact for the exact dataset commit before treating a dataset as valid.

The workflow uses:

```text
ghcr.io/tscnlab/glc-validator:0.5.2
```

For local validation without GitHub Actions, run the same container from the repository that contains `datapackage.json`:

```sh
docker run --rm \
  -v "$PWD":/data \
  -w /data \
  ghcr.io/tscnlab/glc-validator:0.5.2 \
  datapackage.json
```

## Expected package shape

The metadata repository should include a `datapackage.json` with a supported `schema_version`, currently `1.0.0`, `2.0.0`, `3.0.0`, `3.0.1`, `3.0.2`, `3.1.0`, or `3.2.0`. New packages should use `3.2.0`; earlier versions remain supported for reproducibility of packages validated against published releases. The package must declare the required core resources using the canonical resource names:

- `study`
- `participants`
- `datasets`
- `devices`
- `device_datasheets`

The optional canonical resource is:

- `participant_characteristics`

Additional resources may be included. If an additional tabular resource declares a Table Schema, or an additional JSON resource declares a local `jsonSchema`, the validator will validate it. Remote schemas are not supported by the validator container.
For 3.1.0 and 3.2.0, an explicitly declared additional tabular or JSON entity resource
must supply its applicable schema; omission is a metadata error. Unlisted
repository files are not package resources and are not scanned for validation.

## Device calibration (schema 3.2.0; validator 0.7.0)

`device_calibration_date` is required and accepts a valid `YYYY-MM-DD` date or
`uncalibrated`. Declare uncalibrated when no applicable calibration date can be
supplied, including missing historical records. This policy does not establish
that a device was never calibrated. Missing, null, blank, `unknown`, and
impossible dates such as `9999-99-99` fail metadata validation.

Each uncalibrated device generates one `uncalibrated_devices` warning in JSON and
HTML reports. The warning identifies the device and explains the measurement
accuracy limitation; an otherwise valid package passes. Historical versions
remain unchanged. See [the 3.2.0 release notes](docs/schema-3.2.0-release.md).

## Binary validation scope (3.1.0; validator 0.6.0)

Omit `dataset_file` from **all** dataset records for metadata-only validation.
An empty `dataset_file: []` has the same meaning. A non-empty list must contain
complete file groups and requires `dataset_variable_terms`.
Every declared recording must be present. Dataset records without recording
lists can coexist with records listing files; data checks cover listed files
only, not the entire study's collected data. Missing files are errors even when all declared
recordings are absent. Metadata errors prevent recording checks; mere presence
does not establish readability or validity. Older schemas retain their
published required fields.

Generated `validation.json` includes `validation_scope` and `coverage`, including
metadata/data outcomes, declared/present file counts and individual recording
outcomes. `validation.html` renders these alongside errors, warnings and file
fingerprints. The scope is derived, never written back into package metadata.
Warnings are grouped by type with instance counts; empty-value notices remain
included in both report and registry totals. An instance is one emitted warning
message, not one missing cell or one affected participant.
The file manifest hashes available declared package files regardless of check
outcome; a hash is evidence of bytes, not successful content validation.
Unrelated repository files are outside recording-validation scope.

The scope label `metadata_and_data` describes the intended submission scope;
only `coverage.recordings: pass` establishes successful recording checks.
`not_determined` means invalid metadata prevented determining scope.
Declared sampling intervals, usable duration and summary statistics are not
recalculated or compared with recording contents.

The deployed reusable workflow remains pinned to the existing image until
0.7.0 is published and its digest is reviewed and updated. Build the local
container to exercise these changes before publication.

## Configuration

Environment variables:

- `VALIDATION_JSON`: output path for the JSON validation report. Defaults to `validation_out/validation.json`.
- `VALIDATION_MANIFEST`: output path for the checksum manifest. Defaults to `validation_out/validated-files-manifest.json`.
- `VALIDATOR_VERSION`: overrides the version recorded in the validation report. Defaults to the value in `VERSION`.
- `VALIDATOR_IMAGE`: records the validator image digest or tag in the validation report.

## Development

Run the validator directly with Python:

```sh
python glc_validator.py path/to/datapackage.json
```

Or rebuild and run the Docker image after making changes:

```sh
docker build -t glc-metadata-validator .
docker run --rm -v "$PWD":/data -w /data glc-metadata-validator datapackage.json
```
