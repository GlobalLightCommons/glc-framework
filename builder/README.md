# GLC metadata builder

<img src="assets/GLC_Logo.png" alt="Global Light Commons logo" width="320">

A browser-based metadata builder for creating GLC metadata packages without hand-editing JSON and CSV files.

Open the hosted builder here:

```text
https://builder.globallightcommons.org/
```

The builder runs in the browser. Files selected by users are read locally by the browser and are not uploaded to a server.

## What it does

The builder helps data owners create a draft GLC metadata package by guiding them through:

- project setup
- study metadata
- participants and participant characteristics
- devices
- device and sensor datasheets
- participant-level datasets
- dataset file groups and variables
- export and soft validation

It creates packages using the current schema release, `3.0.2`.

## What it exports

The builder can download individual metadata files:

- `datapackage.json`
- `study.json`
- `participants.csv`
- `participant_characteristics.csv`, when rows are present
- `devices.json`
- `device_datasheet.json`
- `datasets.json`

It can also download a metadata package `.zip`.

The zip contains:

- generated metadata files
- the selected schema bundle referenced by `datapackage.json`
- a short `README.txt`

The zip does not include the original data files selected in the dataset file assistant. Those files still need to be added to the exported package before running the full validator.

## Required resources

The GLC datapackage profile requires these core resources:

- `study`
- `participants`
- `datasets`
- `devices`
- `device_datasheets`

The recognized optional resource is:

- `participant_characteristics`

Additional supporting resources, such as scripts, README files, raw-data folders, or codebooks, are allowed by the profile but are not yet exposed in this builder UI.

## Key features

- Schema `3.0.2` is the only new-package option
- Existing `2.0.0` or `3.0.0` packages and builder drafts open in the corrected `3.0.2` workflow
- Required fields marked with red asterisks
- Hover help from local schema descriptions
- JSON/CSV/TSV imports where practical
- Cross-reference dropdowns for study, participant, device, and datasheet IDs
- Multiple dataset records per study
- Dataset file groups with independent modality, device, location, temporal-resolution, datetime, collection, role, and processing metadata
- Header detection for selected CSV/TXT/TSV dataset files
- Auto-detected dataset variables from file headers
- File-group-level variable terms, labels, units, calibration notes, semantic-term dropdowns, and primary-variable selection
- Concise variable labels with an optional description field for full questionnaire prompts, source wording, instructions, and interpretation
- Schema 3.0.2 variable units are required for `numeric` and `integer` variables and omitted for `string`, `boolean`, and `factor` variables. The builder suggests common UCUM codes while permitting a precise custom unit; placeholder values such as `N/A` and `Unknown` are rejected.
- Soft validation panel on the Export page
- Browser-local draft autosave with resume and start-over controls
- Downloadable and re-importable builder drafts (`glc-builder-project.json`)
- Individual metadata downloads and zip export

Autosave remains on the current device in the browser's local storage. Saved
builder drafts preserve metadata entries, detected headers, and selected file names,
but do not contain or retain browser access to the original measurement files.

## Dataset model

For participant-associated data, the builder normally treats one dataset record as the collection of file groups associated with one participant in the relevant study period.

Use a new dataset record when the participant or the relevant study period or measurement context changes. Non-participant data can be represented explicitly by setting the participant association to false.

Use separate file groups when files differ in structure, modality, device association, device location, temporal resolution, datetime representation, collection method, processing state, or analytical role. Device metadata belong to the applicable file group rather than the dataset as a whole.

Examples:

- Head, wrist, and chest sensor data for one participant can be file groups in the same participant dataset, with each sensor group linked to its corresponding device.
- A wear log can be a supporting file group in that participant dataset. Link it to a device only when the complete file group unambiguously concerns one device.
- Questionnaires and diaries can be separate file groups in the participant dataset, with no device link when they concern no device or concern multiple devices collectively.

## Soft validation

The Export page includes a soft validation panel. It does not block downloads.

The panel currently checks for common issues, including:

- missing required study fields
- missing required participants
- missing required device fields
- missing required datasheet fields
- missing dataset IDs and cross-references
- missing dataset file groups, files, columns, datetime metadata, and primary variables
- duplicate dataset IDs
- cross-reference mismatches between datasets, participants, devices, and study

The Python validator remains the authoritative validation step.

## Schema bundle

A local copy of the current schema bundle is included at:

```text
schemas/3.0.2/
```

This lets the builder show schema descriptions as hover help and lets users download schema files directly from the UI.

## Development

For local development, serve the static files from this repository:

```bash
python3 -m http.server 8766
```

Then open:

```text
http://localhost:8766
```

If changes do not appear immediately, hard refresh the browser.
## Dataset templates

Dataset templates are deferred while schema 3.0.2 metadata creation and validation are stabilized. The current testing build creates dataset records manually and does not expose template controls or include builder-specific project state in exported packages. The preserved implementation and remaining work are documented in `docs/dataset-template-backlog.md`.
