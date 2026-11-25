---
title: Validate a dataset
permalink: /validate/
description: Run trusted GLC validation and request inclusion in the GLC Registry
---

<p class="glc-page-lead">
  The GLC validator checks whether a data package follows a supported version
  of the GLC Standard. Validation runs in the dataset's GitHub repository and
  produces a downloadable report containing its errors and warnings.
</p>

<div class="validation-journey" aria-label="Validation journey">
  <a href="#prepare"><span>1</span>Prepare</a>
  <a href="#workflow"><span>2</span>Add workflow</a>
  <a href="#run"><span>3</span>Run</a>
  <a href="#results"><span>4</span>Review results</a>
  <a href="#registry-request"><span>5</span>Request registry inclusion</a>
</div>

## Before you begin

You need:

- a public GitHub repository containing your GLC metadata package;
- a `datapackage.json` file at the repository root;
- every referenced metadata file and every recording listed in the dataset metadata; and
- permission to add files to the dataset repository.

Review the required structure and fields in the
[GLC Standard resource schemas]({{ '/schemas/' | relative_url }}). You can create
or edit the metadata using the
[GLC Metadata Builder](https://builder.globallightcommons.org/) or
prepare the files manually with a text editor.

<div class="glc-note">
  <strong>GitHub terminology used in this guide</strong>
  <ul class="glc-term-list">
    <li><strong>Repository:</strong> the online project containing the data package.</li>
    <li><strong>Commit:</strong> a specific recorded version of the repository's files.</li>
    <li><strong>Workflow:</strong> the instructions that tell GitHub how and when to run validation.</li>
  </ul>
</div>

<h2 id="prepare"><span class="step-number">1</span>Prepare the complete package</h2>

A package exported by the GLC Metadata Builder has this structure:

```text
your-package/
├── datapackage.json
├── README.txt
├── schemas/
│   └── 3.1.0/
│       ├── glc-dp-profile.json
│       └── … resource schemas
└── data/
    ├── study.json
    ├── participants.csv
    ├── participant_characteristics.csv  (when provided)
    ├── devices.json
    ├── device_datasheet.json
    ├── datasets.json
    └── datasets/
        └── your-measurement-files.csv    (only when listed in dataset metadata)
```

The builder exports the package descriptor, resource metadata and schema
files, but it cannot retain the original measurement files selected in the
browser. If your dataset metadata list recording files, add every listed file
at its specified path before validation. For metadata only, follow the steps below.

<h3 id="metadata-only">How to share a metadata-only dataset</h3>

**GLC prioritises openly shared recordings.** Metadata-only packages are accepted
where ethical, consent-related or legal constraints prevent public sharing. These
entries support study discovery but do not provide openly reusable recordings.
They are labelled **Metadata only — recordings not provided**, and validation
covers metadata requirements only. They use the same public-repository and
validation workflow as packages containing recordings. Passing validation establishes
technical compliance; registry inclusion remains subject to maintainer review.

1. Prepare all five required core metadata resources: study, participants,
   datasets, devices, and device datasheets. Optional participant characteristics
   may also be included. These metadata will be public, so include only
   information appropriate for public sharing.
2. In the builder's Datasets page, turn off **Include recording files for this
   dataset** for each record whose recordings you are not supplying. For a
   wholly metadata-only package, turn it off for every dataset record. The
   builder leaves those recording lists out of exported metadata.
3. If preparing JSON manually, omit `dataset_file` or use `"dataset_file": []`.
   Do not list filenames for recordings you will not supply. Variable terms
   may also be omitted when there are no file groups. Do not use `[{}]` as an
   empty list: any supplied group must contain complete file metadata.
4. Export the metadata package and place its descriptor, metadata, and exported
   schema files in the public GitHub repository. For metadata only, no recording
   files are needed. Every required metadata file must still be present.
5. Add and run the validation workflow described below. After metadata checks
   pass, the report identifies the package as **Metadata only**. It does not
   claim to have checked the recordings.
6. Request registry inclusion using the same process below. The registry shows
   an orange **Metadata only** badge and any validation warnings. Include a short
   explanation of the ethical, consent-related or legal constraints in the
   registry pull request, using the template linked below. Maintainers review
   the explanation separately from technical validation.

If some records supply recordings and others do not, all metadata are still
checked and every recording actually listed must be supplied. Recording results
cover listed files only, not the entire study's collected data.

These rules require schema 3.1.0 and validator 0.6.0 or later. The workflow
template below selects the validator 0.6.0 workflow release.

Folders below `data/datasets/` may use descriptive names such as `light/`,
`questionnaires/` or `longitudinal-reports/`. These are organizational
choices, not required folder names. Their paths must agree with the paths
declared in the package metadata.

<div class="glc-note glc-note-important">
  <strong>Keep <code>datapackage.json</code> at the repository root.</strong>
  The supplied workflow expects this location and should be used unchanged.
</div>

Commit and push the complete package to GitHub before configuring validation.

<h2 id="workflow"><span class="step-number">2</span>Add the validation workflow</h2>

Copy the contents of this one file from the validator repository:

<p>
  <a class="glc-action-link" href="https://github.com/GlobalLightCommons/glc-framework/blob/main/validator/templates/github-actions/validate-glc-dataset.yml">
    Open the validation workflow template
  </a>
</p>

The button opens the exact template file that must be copied.

Create this file in the dataset repository and paste the copied contents into
it:

```text
.github/workflows/validate-glc-dataset.yml
```

You do **not** need to copy the validator code, schema directories, Dockerfile
or the validator repository.

### Add the workflow through the GitHub website

1. Open the dataset repository on GitHub.
2. Select **Add file**, then **Create new file**.
3. Enter the complete filename `.github/workflows/validate-glc-dataset.yml`.
   GitHub creates the two folders automatically.
4. Open the
   [workflow template](https://github.com/GlobalLightCommons/glc-framework/blob/main/validator/templates/github-actions/validate-glc-dataset.yml)
   in another tab.
5. Copy its complete contents and paste them into the new file.
6. Select **Commit changes**.

The workflow calls the centrally released GLC validator. Users do not need to
install Python, Docker or the validator on their own computers.

<h2 id="run"><span class="step-number">3</span>Run validation</h2>

Validation runs automatically when changes are pushed to `main`, when a pull
request is opened or updated, or when the workflow is started manually.

To start it manually:

1. Open the dataset repository on GitHub.
2. Select the **Actions** tab.
3. Select **Validate GLC Dataset** in the workflow list.
4. Select **Run workflow**.
5. Choose the branch containing the package.
6. Select the green **Run workflow** button.
7. Wait for the run to finish.

A green check means validation passed. A red cross means that one or more
errors prevented it from passing. A passing run can still contain warnings
that should be reviewed.

<h2 id="results"><span class="step-number">4</span>Review errors and warnings</h2>

### Metadata-only or metadata and data (3.1.0, validator 0.6.0)

For metadata-only submission, omit `dataset_file` from every dataset record.
An empty `dataset_file: []` is also accepted; incomplete file-group objects are not.
All five core metadata resources are still required. Dataset records without
recording lists may coexist with records listing files. Every listed recording
must be supplied; recording results cover those listed files only, not all data
collected in the study. Missing listed files fail validation even when none are present;
they never cause automatic acceptance as metadata-only. In the builder, turn
off **Include recording files for this dataset** for every dataset to export
metadata only. The zip never includes the selected original recordings.

Metadata checks run first. Recording checks run only after metadata and
file-presence checks pass. Files not declared as recordings are not scanned or
automatically validated as recordings. Explicit additional resource declarations
retain their own validation rules. The derived scope appears in generated
reports and the registry, not as a flag added to submitted metadata.

Metadata-only acceptance means lower validation coverage, not failed metadata.
The orange registry badge makes this distinction; pass/fail remains separate.
The warnings column expands to messages for the same verified run.
Warnings are grouped by type and instance count, including empty-value notices.
One empty-value instance describes one file/column combination and can cover
many empty cells. The registry shows up to 20 example messages within each type;
the downloaded report retains the complete messages.

Validation does not independently verify scientific accuracy, recalculate
summary statistics, confirm preprocessing or calibration, verify usable
recording duration or contiguity, or compare declared sampling intervals with
observed timestamp spacing. Timestamp checks test declared formats, not spacing.

The workflow template selects validator 0.6.0 using a versioned workflow release
and an immutable container digest. Existing repositories pinned to older workflow
releases must update their workflow reference to use the new validator. Updating
the validator does not change a package's declared schema version.

The downloadable **validation-report** artifact is the main place to inspect
the results:

1. Open the repository's **Actions** tab.
2. Select **Validate GLC Dataset**.
3. Select the relevant workflow run.
4. On the run summary page, scroll to **Artifacts**.
5. Download **validation-report**.
6. Unzip the downloaded file.

<div class="validation-files">
  <article>
    <h3><code>validation.html</code> (validator 0.6.0)</h3>
    <p>Open this downloaded report in a browser for scope, metadata and recording
      outcomes, per-file coverage, errors, warnings and the submitted-file inventory.
      A submission scope is not itself a passing result.</p>
  </article>
  <article>
    <h3><code>validation.log</code></h3>
    <p>
      Start here. This is the human-readable report containing the errors and
      warnings. Messages normally identify the affected resource or file and,
      where possible, its field, column or row.
    </p>
  </article>
  <article>
    <h3><code>validation.json</code></h3>
    <p>
      The structured report records the overall status, schema and validator
      versions, validation time, errors and warnings. It is also consumed by
      registry automation.
    </p>
  </article>
  <article>
    <h3><code>validated-files-manifest.json</code></h3>
    <p>
      A submitted-file inventory with paths, presence, sizes and SHA-256 hashes.
      Available declared files are fingerprinted even when checks fail or never
      run. Absent files have no hash. A hash identifies bytes; the separate
      coverage results establish which checks ran and passed. Metadata resources
      pointing to a directory list the JSON files loaded from it individually.
    </p>
  </article>
  <article>
    <h3><code>exit_code.txt</code></h3>
    <p>
      Contains <code>0</code> when validation passed and <code>1</code> when
      validation failed.
    </p>
  </article>
</div>

### How to interpret the messages

**Errors prevent the package from passing.** Examples include an absent
required field, an invalid type or format, a missing referenced file, a broken
identifier reference, or a quantitative variable without its required unit.

**Warnings do not prevent the package from passing.** They identify issues
worth reviewing, such as missing source-data cells or uneven row widths.

Correct errors in the package, commit and push the changes, and inspect the
new workflow run. Validation applies to one exact commit: an older passing
report does not validate later changes.

The validation step within the GitHub Actions job also displays the messages,
but the artifact is easier to download, retain and inspect.

<h2 id="registry-request"><span class="step-number">5</span>Request inclusion in the GLC Registry</h2>

Passing validation does **not** automatically publish a repository in the
registry. The dataset owner proposes an entry, automated checks verify the
validation evidence, and a GLC maintainer reviews the request.

<p>
  <a class="glc-action-link" href="{{ '/registry/' | relative_url }}">
    View the GLC Registry
  </a>
</p>

The registry repository maintains its list in
[`datasets.yml`](https://github.com/GlobalLightCommons/glc-framework/blob/main/registry/datasets.yml).
Only submit a request after the dataset's `main` branch has a passing
validation run for its current commit.

### Prepare the entry

Add an entry under `datasets:` without deleting any existing entries:

```yaml
  - name: Your study or dataset title
    repo: github-owner/your-dataset-repository
    branch: main
```

For example:

```yaml
  - name: MeLiDos IZTECH - Izmir, Türkiye
    repo: tscnlab/melidos-iztech-glc-dataset
    branch: main
```

- `name` is the study or dataset title displayed in the registry.
- `repo` is the exact GitHub repository in `owner/repository` form.
- `branch` is the validated branch, normally `main`.

Do not enter the status, schema version, commit hash or validation date
manually. Registry automation reads those values from the trusted validation
artifact for the exact dataset commit.

### Open the registry pull request

If you can edit the registry repository:

1. Open
   [`datasets.yml`](https://github.com/GlobalLightCommons/glc-framework/blob/main/registry/datasets.yml).
2. Select the pencil icon.
3. Add the entry.
4. Select **Commit changes**.
5. Choose **Create a new branch for this commit and start a pull request**.
6. Open the pull request against the registry's `main` branch.

If GitHub does not allow you to edit the file, fork
[`GlobalLightCommons/glc-framework`](https://github.com/GlobalLightCommons/glc-framework),
edit `registry/datasets.yml` in your fork, and open a pull request from that
fork to `GlobalLightCommons/glc-framework:main`.

### Metadata-only requests: add a justification

**If your package contains recordings, your dataset-list change is sufficient;
no justification template is required.**

**Only metadata-only requests need the additional explanation below.** Both
types of submission still require an entry in the dataset list and a passing
validation run.

For a metadata-only request, use the [metadata-only pull-request template](https://github.com/GlobalLightCommons/glc-framework/compare?expand=1&template=metadata-only-inclusion.md),
selecting the branch or fork containing your dataset-list change. If a request
is already open, copy the [template contents](https://github.com/GlobalLightCommons/glc-framework/blob/main/.github/PULL_REQUEST_TEMPLATE/metadata-only-inclusion.md)
into its description. You can also copy the template below. No separate form is required.

<details markdown="1">
<summary>Metadata-only justification template — copy into the PR description</summary>

```markdown
## Metadata-only justification

A GLC maintainer will review this justification before approving registry inclusion.
Passing validation alone does not guarantee inclusion.

### owner/repository

<!-- Replace owner/repository with your repository name. Explain the ethical,
consent-related or legal constraints preventing public sharing of recordings.
Do not include confidential details or participant information. -->
```

</details>

For each metadata-only package, replace `### owner/repository` with the exact
repository slug in your entry and supply a short justification beneath it.
Do not include confidential details or participant information. For packages
containing recordings, this justification is not required. Repository targets
and validation results are read automatically, so do not enter those manually.

The **Registry inclusion checks** workflow reads verified validation evidence,
not a contributor's claim about scope. It fails if a metadata-only justification
is absent or still a placeholder, and shows what needs to be completed in the
Actions check summary. Editing the description reruns the check. Reports that
do not record validation scope require revalidation for new or target-changed
entries. A supplied explanation still needs maintainer review; automated checks
do not establish that a restriction is justified.

### What happens after submission

The automated pull-request check:

1. locates the current commit of the specified dataset branch;
2. finds the validation artifact produced for that exact commit;
3. verifies that it came from an accepted GLC validation workflow; and
4. confirms that the validation status is `pass`.

<div class="glc-note glc-note-review">
  <strong>Automated checks are not approval.</strong>
  A GLC maintainer must review and approve the request. The dataset appears in
  the public registry only after a maintainer merges the pull request and the
  registry deployment finishes. Editing a fork or opening a pull request does
  not publish the entry by itself.
</div>

After publication, the registry displays the validated repository, commit,
schema version, status and validation time. The result applies only to that
commit and schema version—not to later commits or later GLC schema versions.

The **Send to LLW** action is a separate optional step for passing packages
that should be sent to LightLogWeb. Registry inclusion alone does not transfer
the dataset.
