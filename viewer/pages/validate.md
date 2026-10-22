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

- a GitHub repository containing your complete GLC data package;
- a `datapackage.json` file at the repository root;
- every metadata and data file referenced by `datapackage.json`; and
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
│   └── 3.0.2/
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
        └── your-measurement-files.csv    (add after export)
```

The builder exports the package descriptor, resource metadata and schema
files, but it cannot retain the original measurement files selected in the
browser. Add those files at the paths declared in `data/datasets.json` before
validation.

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
  <a class="glc-action-link" href="https://github.com/tscnlab/glc-metadata-validator/blob/main/templates/github-actions/validate-glc-dataset.yml">
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
   [workflow template](https://github.com/tscnlab/glc-metadata-validator/blob/main/templates/github-actions/validate-glc-dataset.yml)
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
      A checksum manifest showing exactly which file contents were validated.
      It establishes the identity of the validated package; it is not the main
      error report.
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
[`datasets.yml`](https://github.com/globallightcommons/glc-registry/blob/main/datasets.yml).
Only submit a request after the dataset's `main` branch has a passing
validation run for its current commit.

### Prepare the entry

Add an entry under `datasets:` without deleting any existing entries:

```yaml
  - id: your-dataset-name
    repo: github-owner/your-dataset-repository
    branch: main
```

For example:

```yaml
  - id: melidos-iztech-glc-dataset
    repo: tscnlab/melidos-iztech-glc-dataset
    branch: main
```

- `id` is a short, unique name for the registry entry.
- `repo` is the exact GitHub repository in `owner/repository` form.
- `branch` is the validated branch, normally `main`.

Do not enter the status, schema version, commit hash or validation date
manually. Registry automation reads those values from the trusted validation
artifact for the exact dataset commit.

### Open the registry pull request

If you can edit the registry repository:

1. Open
   [`datasets.yml`](https://github.com/globallightcommons/glc-registry/blob/main/datasets.yml).
2. Select the pencil icon.
3. Add the entry.
4. Select **Commit changes**.
5. Choose **Create a new branch for this commit and start a pull request**.
6. Open the pull request against the registry's `main` branch.

If GitHub does not allow you to edit the file, fork `globallightcommons/glc-registry`,
edit `datasets.yml` in your fork, and open a pull request from that fork to
`globallightcommons/glc-registry:main`.

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
