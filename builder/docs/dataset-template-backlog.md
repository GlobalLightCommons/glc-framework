# Dataset template feature backlog

Dataset templates are a builder-only convenience feature. They are not part of the GLC scientific metadata schema and must not appear in `datasets.json`, `datapackage.json`, or validator output.

The current implementation is preserved on the `schema-3.0.0-development` branch. It is disabled on the `schema-3.0.0-testing` branch so schema and validator testing can proceed independently.

## Intended workflow

- Users may skip templates and create dataset records manually.
- Users may create a reusable dataset and file-group structure on a separate template page.
- A saved template may generate linked dataset records for selected participants.
- Template updates propagate inherited values to linked datasets.
- Dataset-specific overrides remain unchanged when a template is updated.
- An inherited file group may be excluded from one dataset and restored later.
- A dataset may be detached so subsequent template updates no longer affect it.

## Required persistence work

- Save the complete editable builder state automatically in browser storage.
- Restore that state after refresh or reopening the builder.
- Show a clear saved-locally status and provide a clear-saved-project command.
- Warn before imported project state replaces current work.
- Export a portable `glc-builder-project.json` containing templates, links, overrides, and exclusions.
- Import that project file on another browser or computer.
- Validate the builder project version and report malformed or incompatible files clearly.
- Keep browser storage as convenience and the project file as the durable portable copy.

## Required interface work

- Present an unambiguous choice between creating a new template and editing a saved template.
- Keep participant association visible because it is reusable structural metadata.
- Clearly separate template editing from ordinary dataset editing.
- Make the create-datasets-from-template action prominent on the Datasets page.
- Explain that one linked dataset is created per selected participant.
- Provide complete empty, disabled, imported-invalid, and error states.
- Ensure templates remain entirely optional throughout navigation and export.

## Required automated tests

- Create a template, refresh, and confirm it remains available.
- Export and re-import `glc-builder-project.json` and restore all relationships.
- Create linked datasets for an arbitrary selection of participants.
- Propagate template changes to inherited values.
- Preserve a dataset-specific field override during later template updates.
- Preserve an excluded inherited file group during later updates.
- Restore an excluded file group explicitly.
- Detach a dataset and confirm later template updates do not affect it.
- Confirm builder-only template fields never appear in scientific metadata.
- Import a normal metadata package without a builder project file.
- Report empty, malformed, older, and incompatible project files clearly.
- Exercise desktop and mobile workflows with browser-level tests.

## Conditions for re-enabling templates

- Schema 3.0.2 metadata structure and validator behavior are stable.
- Builder-generated 3.0.2 packages pass the validator end to end.
- Persistence and portable project import/export are complete.
- Template propagation and serialization have unit tests.
- Complete template journeys pass browser tests on desktop and mobile.
- Schema 2.0.0 behavior remains unaffected.
