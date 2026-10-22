# Sophisticated GLC datapackage viewer

## Purpose

The current GLC viewer primarily provides schema documentation and a registry
dashboard. A future sophisticated datapackage viewer should open an actual GLC
datapackage and allow users to explore its metadata, relationships, validation
state, and tabular data without manually navigating JSON and CSV files.

## Proposed capabilities

- Present a study overview including title, description, location, study
  groups, contributors, funding, and other available study metadata.
- Summarize participants and participant characteristics with appropriate
  privacy-aware controls.
- Organize datasets by participant, session, file group, and modality.
- Display devices, placements, firmware, datasheets, and calibration metadata.
- Provide navigable relationships between studies, participants, datasets,
  file groups, devices, and variables.
- Present a searchable variable dictionary containing labels, descriptions,
  types, units, semantic terms, and factor levels.
- Preview tabular resources with pagination, filtering, sorting, and
  missing-value summaries.
- Plot suitable time-series measurements such as light exposure, melanopic EDI,
  activity, and temperature.
- Report timestamp coverage, sampling intervals, gaps, and missing
  measurements.
- Clearly distinguish raw and processed data and display preprocessing and
  provenance metadata.
- Display validation status, errors, warnings, validator version, and validated
  commit.
- Load registered GitHub datapackages and support downloads of individual
  resources or the complete package.
- Render each supported schema version using its corresponding immutable schema
  release and version-specific compatibility adapters where needed.

## Illustrative MeLiDos use case

A user should be able to select participant `IZTECH_S004`, inspect the
participant's head, wrist, and chest recordings, understand the AL03/AL04
head-device transition, review associated questionnaires and diaries, inspect
the variable metadata, and plot relevant light measurements.

## Relationship to the current viewer

The current registry logic and Jekyll documentation can be retained while the
interactive datapackage explorer is developed as a separate application
surface. Updating schema documentation for GLC 3.0.2 is a prerequisite, but it
is not itself the sophisticated datapackage viewer described here.

## Suggested delivery phases

1. Connect the viewer to the canonical, versioned GLC schema source.
2. Update schema documentation and remove obsolete legacy content. **Completed locally.**
3. Add a valid, compact GLC 3.0.2 example and automated rendering tests.
4. Implement metadata and relationship browsing.
5. Add tabular previews, variable dictionaries, and validation information.
6. Add time-series visualization and data-quality summaries.
7. Add repository loading, downloads, privacy controls, and support for older
   schema versions.

### Example-package refinement

- [ ] Expand the compact IZTECH example from one participant to two or three
  representative participants so users can see repeated participant,
  characteristic, dataset, file-group, and device records.
- [x] Add an initial populated-schema view that presents example values
  alongside corresponding field labels and descriptions from the resource
  schemas, with nested JSON and tabular CSV rendering.
- [x] Provide direct CSV/JSON downloads for the current example resources.
- [x] Provide a downloadable GLC 3.0.2 schema bundle.

## Shared visual identity

- [ ] Refresh the metadata builder after the viewer review is complete so the
  builder, viewer, and visualdiet.org share the same GLC header, typography,
  cyan accent, navigation hierarchy, and dark footer treatment.
- [ ] Replace the builder's beige-heavy page background with a cleaner neutral
  treatment while retaining subtle GLC accent colours and clear form-panel
  separation.
