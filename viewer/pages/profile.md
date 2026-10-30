---
layout: profile
title: GLC data package standard
permalink: /profile/
toc: true
---

## How to use this reference

New to GLC? Start with the [populated example package]({{ '/example-package/' | relative_url }})
before looking up individual fields.

- **Package profile:** the rules for `datapackage.json`, the descriptor that
  identifies a package and lists its metadata resources. This page documents it.
- **[Resource schemas]({{ '/schemas/' | relative_url }}):** the fields, types,
  and requirements for study, participant, device, and dataset metadata.
- **[Example package]({{ '/example-package/' | relative_url }}):** populated
  files showing how those rules work together.

Use the [Metadata Builder](https://builder.globallightcommons.org/) to enter
metadata through forms, or the reference below to prepare files yourself.
Then [validate the complete data package]({{ '/validate/' | relative_url }}).

GLC metadata are expressed in a `datapackage.json` descriptor and linked core
resources. The package follows the
[Frictionless Data Package](https://specs.frictionlessdata.io/data-package/#specification)
specification with GLC-specific constraints. Properties marked with `*` are
required. GLC 3.0.2 defines the core resources `study`, `participants`,
`datasets`, `devices`, and `device_datasheets`; `participant_characteristics`
is optional.
