---
title: Example data package
permalink: /example-package/
toc: true
---

This compact GLC 3.0.2 example is derived from the
[MeLiDos IZTECH data package](https://github.com/tscnlab/melidos-iztech-glc-dataset).
It shows how metadata resources and data files are organized and linked in a
valid package without reproducing the complete study repository.

<a class="glc-download-button" href="{{ '/assets/downloads/glc-example-package.zip' | relative_url }}" download>
  Download the complete example package (.zip)
</a>

## What this example demonstrates

The package links one study and study group to participant `IZTECH_S004`,
their characteristics, two head/light-glasses devices, the shared ActLumus
datasheet, and four representative data files—including a compact extract of
the measured light data. The two device records
demonstrate a mid-study device replacement while preserving an unambiguous
device reference for each file group.

## Package structure

```text
glc-example-package/
├── datapackage.json
├── json-entity-resource.json
├── schemas/
│   └── 3.0.2/
└── data/
    ├── study.json
    ├── participants.csv
    ├── participant_characteristics.csv
    ├── devices.json
    ├── device_datasheets.json
    ├── datasets.json
    └── files/
        ├── light/
        │   └── IZTECH_S004_light_glasses_example.csv
        ├── questionnaires/
        │   └── IZTECH_S004_acceptability.csv
        └── longitudinal-reports/
            ├── IZTECH_S004_experiencelog_AL03.csv
            └── IZTECH_S004_experiencelog_AL04.csv
```

{% include example_viewer.html %}

## Try the next step

Download and unzip the example to inspect the files on your computer. For your
own study, use the [Metadata Builder](https://builder.globallightcommons.org/)
to create descriptions of your actual study, participants, devices, and files.
Example identifiers and study details must be replaced with your own.

**[Validate your data package]({{ '/validate/' | relative_url }})** explains how
to check the complete package, read the report, and request registry inclusion.
