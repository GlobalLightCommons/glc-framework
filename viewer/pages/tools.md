---
title: Tools
permalink: /tools/
description: Open-source software supporting the Global Light Commons ecosystem
---

<p class="tools-intro">
  Open-source software for creating, validating, discovering, accessing, and
  analyzing Global Light Commons data packages.
</p>

Start with the **Metadata Builder** to describe your own files, then use the
**Metadata Validator** to check the complete package. The **example viewer**
on the [Example package page]({{ '/example-package/' | relative_url }}) lets
you inspect an existing package before creating your own. GLC-dp and LightLogR
support later discovery, import, and analysis in R.

<div class="tools-grid">
  <article class="tool-card">
    <span class="tool-card-icon" aria-hidden="true"><i class="fa-solid fa-pen-to-square"></i></span>
    <h2>Metadata Builder</h2>
    <p>Create standardized GLC metadata packages through an interactive web interface.</p>
    <p><strong>You provide:</strong> study and device information, participant IDs, and details of your measurement files.<br><strong>You get:</strong> metadata and schema files to export and combine with your measurement files. The builder does not clean the measurements for you.</p>
    <a class="tool-card-link" href="https://builder.globallightcommons.org/" target="_blank" rel="noopener noreferrer">Launch Builder <span aria-hidden="true">→</span></a>
  </article>

  <article class="tool-card">
    <span class="tool-card-icon" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>
    <h2>Metadata Validator</h2>
    <p>Validate metadata packages against the GLC standard using GitHub Actions and the GLC validator.</p>
    <p><strong>You provide:</strong> a complete data package in a GitHub repository.<br><strong>You get:</strong> a report of errors and warnings for the checked version. Validation checks structure and consistency; review of scientific quality remains your responsibility.</p>
    <a class="tool-card-link" href="{{ '/validate/' | relative_url }}">Read the validation guide <span aria-hidden="true">→</span></a>
  </article>

  <article class="tool-card">
    <span class="tool-card-icon tool-card-logo" aria-hidden="true"><img src="{{ '/assets/glcdp-logo.png' | relative_url }}" alt=""></span>
    <h2>GLC-dp</h2>
    <p>Discover, inspect, access, and import validated GLC data packages in R or through an interactive explorer.</p>
    <p><strong>You provide:</strong> a package or registry entry to explore.<br><strong>You get:</strong> access to package metadata and data for use in R or the explorer.</p>
    <a class="tool-card-link" href="https://tscnlab.github.io/glc-dp-r/" target="_blank" rel="noopener noreferrer">View documentation <span aria-hidden="true">→</span></a>
  </article>

  <article class="tool-card">
    <span class="tool-card-icon tool-card-logo" aria-hidden="true"><img src="{{ '/assets/lightlogr-logo.png' | relative_url }}" alt=""></span>
    <h2>LightLogR</h2>
    <p>Process, analyze, and visualize data from wearable light loggers and optical radiation dosimeters in R.</p>
    <p><strong>You provide:</strong> supported light-logger data and an R analysis workflow.<br><strong>You get:</strong> processed data, analysis results, and visualizations. This is separate from creating or validating GLC metadata.</p>
    <a class="tool-card-link" href="https://tscnlab.github.io/LightLogR/" target="_blank" rel="noopener noreferrer">View documentation <span aria-hidden="true">→</span></a>
  </article>
</div>
