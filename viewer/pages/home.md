---
title: Global Light Commons
permalink: /
description: Interoperable metadata and data packages for light-exposure and optical-radiation research
---

The **Global Light Commons (GLC)** provides a community-developed data-package
standard and open tooling for interoperable, FAIR, and reproducible
light-exposure and optical-measurement research.

A GLC data package is a
[Frictionless Data Package](https://specs.frictionlessdata.io/data-package/)
whose `datapackage.json` descriptor connects study, participant, dataset,
device, datasheet, and optional participant-characteristic metadata with the
underlying data files.

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
[GLC metadata validator](https://github.com/tscnlab/glc-metadata-validator),
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
