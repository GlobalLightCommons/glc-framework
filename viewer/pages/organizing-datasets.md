---
title: Organizing datasets and file groups
permalink: /organizing-datasets/
toc: true
description: Decide how to group participants, recording sessions, devices, and files before creating GLC dataset metadata
---

Before creating dataset records in the [Metadata Builder](https://builder.globallightcommons.org/),
decide which recordings belong together and which files can share metadata.
This guide describes the GLC 3.2.0 model. For individual field requirements,
see the [resource schemas]({{ '/schemas/' | relative_url }}).

## Dataset records and file groups

A **data package** can describe an entire study. It contains metadata resources
and the measurement files you are sharing.

A **dataset record** links a study to recordings for one participant in a
measurement context, such as a monitoring period or visit. Set participant
association to **Yes** and select that participant. For measurements without
participant association, such as independent environmental monitoring, select
**No** and omit the participant ID.

A **file group** describes one or more files within a dataset record. Its files
share a structure and the metadata needed to interpret them: variables, units,
device association, placement, sampling arrangement, timestamps, collection
instructions, processing state, and analytical role. Files do not need to be
merged into one physical file to share a group.

**A change of device, body/device location, or sensor modality alone does not
require a new dataset record.** Use separate file groups when those files belong
to the same participant measurement context but need different metadata.

## When to create a new record or group

| Situation | How to organize it |
| --- | --- |
| Different participant | Create a separate dataset record. A participant-associated record refers to exactly one participant. |
| Same participant, distinct visit or measurement context | Normally create a separate dataset record with its own ID. Reuse the participant ID. |
| Same participant and context, different device or placement | Use separate file groups with the appropriate device IDs and placements. |
| Files differ in columns, units, timestamp representation, sampling arrangement, instructions, processing state, or role | Use separate file groups so each description applies to all files in its group. |
| Multiple files share all applicable group metadata | List them together in one file group and describe the shared variables once. |
| One sensor file contains both light and activity columns | Use one group with both light and accelerometry modalities when the shared metadata apply. |
| Questionnaire, diary, or wear log accompanies sensor recordings | Use a separate file group within the same dataset context. These modalities must not be combined with sensor modalities in a single group. |

One participant can have **multiple dataset records**. A dataset record can also
cover multiple recording sessions when you intentionally treat them as one
measurement context. GLC does not require a new record for every gap in recording.
Explain session timing in the file-group description, or in the study description
when it applies across the study. If you provide the optional recording duration
and contiguity fields, supply them together with the duration unit; duration
counts cumulative usable data, excluding gaps and invalid recordings.

## Examples

### Light and activity for 20 participants

Suppose each participant has one light file and one activity file from the same
monitoring period, with different column structures. Create **20 dataset records**,
each with **two file groups**: light and accelerometry. That is 40 groups describing
40 measurement files. The participants share the study reference, but each record
has its own dataset ID and participant reference.
In the current builder, all 40 file groups must be configured individually,
even where much of their metadata repeats across participants.

If each participant instead has seven daily light files with the same structure
and acquisition metadata, those seven files can share that participant's light
group. You describe their common variables once, rather than seven times.
Files for different participants remain in their respective dataset records.

### Multiple devices or a replacement device

Wrist and chest sensors used during one participant's monitoring period can be
separate file groups in one dataset record. Give each group its device reference
and placement. A replacement device has its own physical device ID; separate the
files from before and after the replacement into groups with the correct device
references. The device change alone does not force a new dataset record.

### Repeated study periods

For distinct baseline and follow-up visits, normally create two dataset records
linked to the same participant. Use clear IDs, such as `DS_P01_BASELINE` and
`DS_P01_FOLLOWUP`, and describe the context of each.

If two seasonal sessions are intentionally represented as one dataset, keep their
files in shared or separate groups according to their structure and acquisition
metadata. Describe the session timing. Two usable two-week sessions separated by
a seasonal break can be described as four weeks of noncontiguous recording.

### Supporting questionnaires

A questionnaire about the same monitoring period can be a separate supporting
file group in the participant's dataset. Choose **supporting** when it provides
context for the principal analysis; a questionnaire can instead be **primary**
when it contains principal analysis data. Link it to a device only if the complete
group unambiguously concerns that one device. Shared timing with a sensor file
does not by itself justify a device reference.

## Reducing repeated entry

Within a file group, variable definitions and other group metadata apply to all
listed files. The builder can detect column names from selected file headers;
review their meanings, types, units, and timestamp settings before exporting.
Study, participant, device, and datasheet records are referenced by ID, so their
full descriptions do not need to be repeated in every group.

Across participants, the current builder still creates dataset records manually.
**Reusable dataset template controls are not currently available.** Saved builder
drafts preserve work for later editing, but do not generate participant records
or retain measurement-file contents.

For larger studies, someone comfortable with scripting can generate dataset
metadata from a reviewed example and import the resulting JSON through the
builder's dataset import. Update every dataset ID, participant reference, file
path, device association, and other participant-specific value. Review the
imported records and [validate the complete package]({{ '/validate/' | relative_url }}).

See the [populated example package]({{ '/example-package/' | relative_url }})
to inspect how metadata and measurement files are linked.
