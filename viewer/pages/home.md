---
title: Global Light Commons
permalink: /
description: Interoperable metadata and data packages for light-exposure and optical-radiation research
---

The **Global Light Commons (GLC)** provides a community-developed data-package
standard and open tooling for interoperable, FAIR, and reproducible
light-exposure and optical-measurement research. It helps you describe your
measurements consistently, check the resulting package, and make it easier
for other researchers to understand and reuse.

## Start here

1. **Understand the standard.** Start with the
   [populated example package]({{ '/example-package/' | relative_url }}) to see
   how measurement files and their descriptions fit together.
2. **Create metadata.** Use the
   [Metadata Builder](https://builder.globallightcommons.org/) to describe
   your study, participants, devices, and files, then export the package.
3. **Validate your data package.** Follow the
   [validation guide]({{ '/validate/' | relative_url }}) to add your measurement
   files, run the checks, and correct errors.
4. **Share and discover.** After a passing validation, request a listing in the
   [dataset registry]({{ '/registry/' | relative_url }}). Listing requires a
   separate request and maintainer review.

<p><a class="glc-action-link" href="https://builder.globallightcommons.org/">Create metadata</a>
<a class="glc-action-link" href="{{ '/validate/' | relative_url }}">Validate your data package</a></p>

## What is a data package?

A **data package** contains measurement files plus **metadata**: information
explaining the study, participants, devices, variables, units, and file paths.
The builder creates the descriptions; you add the measurement files themselves.

A GLC data package is a
[Frictionless Data Package](https://specs.frictionlessdata.io/data-package/)
whose `datapackage.json` descriptor connects study, participant, dataset,
device, datasheet, and optional participant-characteristic metadata with the
underlying data files.

In everyday use, “dataset” can mean an entire study's shared data. Within the
GLC schema, a **dataset record** groups files for one participant, or for
measurements without a participant association, and links them to a study.
One data package can contain many such records. A **resource** is one of the
metadata tables or JSON files declared in the package descriptor.

Resource | Purpose
--- | ---
`datapackage.json` | Package identity, GLC schema version, and resource declarations.
`study` | Study design, contributors, groups, eligibility, funding, and related metadata.
`participants` | Participant identifiers and study-group membership.
`datasets` | Participant or study datasets, file groups, modalities, variables, timestamps, and device links.
`devices` | Physical device identities, placement-independent properties, firmware, and datasheet links.
`device_datasheets` | Model-level channels, calibration, and measurement characteristics.
`participant_characteristics` | Optional participant-level characteristics and derived phenotypes.

## GLC 3.0.2

This site documents GLC schema version **3.0.2**. The schema bundle is sourced
from the canonical
[GLC metadata validator](https://github.com/GlobalLightCommons/glc-framework/tree/main/validator),
which also performs cross-resource, file-header, type, timestamp, and
device-linkage checks that cannot be expressed fully in JSON Schema alone.

Use the navigation links above to inspect the package profile, browse the
resource schemas, open the registry, or create metadata with the builder.

## Dataset registry

The [GLC dataset registry]({{ '/registry/' | relative_url }}) lists dataset
repositories that have run the trusted GLC validation workflow. It reports the
validation result, schema version, validated commit, and validation time so
users can distinguish current packages from legacy or unverified records.

## Related software

- [GLC metadata builder](https://builder.globallightcommons.org/)
- [Validate a dataset]({{ '/validate/' | relative_url }}) — follow the complete workflow from package preparation to registry review.
- [LightLogR](https://github.com/tscnlab/LightLogR)

## Citation

For the underlying metadata recommendations:

> Spitschan M, Hammad G, Blume C, et al. Metadata recommendations for light
> logging and dosimetry datasets. *BMC Digital Health* 2, 73 (2024).
> <https://doi.org/10.1186/s44247-024-00113-9>

The original Frictionless documentation implementation was informed by
[Camtrap DP](https://camtrap-dp.tdwg.org); no Camtrap schema or example content
is used by GLC 3.0.2.
