---
layout: tables
title: Schemas
permalink: /schemas/
toc: true
---

The GLC 3.1.0 schemas define the structure, constraints, and relationships of
metadata used to describe light-exposure and optical-measurement studies.
The schemas are maintained in the
[GLC framework repository](https://github.com/GlobalLightCommons/glc-framework).
Tabular resources use
[Frictionless Table Schema](https://specs.frictionlessdata.io/table-schema/);
structured resources use JSON Schema. The tables below show required fields
(`*`), permitted values, descriptions, and cross-resource references.

Resources marked with `*` are required.

<a class="glc-download-button" href="{{ '/assets/downloads/glc-schemas-3.1.0.zip' | relative_url }}" download>
  Download the GLC 3.1.0 schema bundle (.zip)
</a>

[How to prepare and validate a data package]({{ '/validate/#prepare' | relative_url }}).

<details markdown="1">
<summary>Package requirements and validation coverage</summary>

**GLC prioritises openly shared recordings.** Metadata-only packages are accepted
where ethical, consent-related or legal constraints prevent public sharing. These
entries support study discovery but do not provide openly reusable recordings.
They are labelled **Metadata only — recordings not provided**, and validation
covers metadata requirements only. Registry inclusion requires maintainer review.

The same five core metadata resources are required in either case: **study,
participants, datasets, devices, and device datasheets**. Participant
characteristics are optional.

- **Metadata and recordings:** list the files you are supplying under
  `dataset_file`, with complete file-group metadata. Every listed file must be
  included at its specified path. `dataset_variable_terms` is required when a
  dataset record contains file groups.
- **Metadata-only exceptions:** in each dataset record, omit `dataset_file` or
  leave it as an empty list (`[]`). You do not need filenames or variable
  descriptions for recordings you are not supplying.

Dataset records without recording lists may coexist with records that list
files. Validation checks all metadata and the listed recordings; it does not
establish completeness of all data collected in a study. A missing listed file
is an error, even if none of the listed files are supplied. An incomplete group
such as `dataset_file: [{}]` is not an empty recording list.

The validator reports its scope automatically. Contributors do not add access
levels or a metadata-only flag to their metadata. An orange **Metadata only**
registry badge means recording contents were not assessed, not that the
metadata failed validation.

These submission rules apply to schema 3.1.0 with validator 0.6.0; the production
workflow must use that validator before metadata-only submissions can be accepted.

</details>

## Resource schemas
