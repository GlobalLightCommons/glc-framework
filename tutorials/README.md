# Beginner tutorial draft

[`beginner-data-package.qmd`](beginner-data-package.qmd) is a Quarto tutorial draft, with explicit audience assumptions, a fictional cleanup exercise, builder guidance, GitHub validation, and registry-review instructions. It is not linked into the published ecosystem pages yet: audience assumptions and a novice walkthrough should be reviewed first.

The draft assumes basic folder and spreadsheet/text-file handling and access to study records. It teaches GitHub and GLC concepts without requiring Git, JSON editing, a terminal, R, Python, or Docker. Cleanup instructions are tool-neutral; the choice of application-specific examples is open for review.

Intended learning objectives frame the tutorial and connect each skill to an observable checkpoint. GitHub basics are introduced in context, with official external tutorials for the first repository, connecting a local working folder, and cloning an existing repository. Computing fundamentals and detailed application installation are outside scope.

Render for review with an installed Quarto CLI (RStudio also bundles one):

```sh
quarto render tutorials/beginner-data-package.qmd
```

Open the generated HTML alongside the `practice/` directory so the exercise download links work. Readers do not need Quarto. The source includes no executable code chunks and needs no R/Python environment. Generated HTML is ignored by Git; the `.qmd` and practice files are the maintained sources.

The practice CSVs are fictional, not a complete GLC package, and must not be submitted to the real registry. The field notes explain exactly which cleanup decisions are justified. Do not generalize the exercise's duplicate-removal or missing-value policy without checking the source data.
