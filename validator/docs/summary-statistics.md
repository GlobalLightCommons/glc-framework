# Study summary statistics

The active 3.1.0 study schema accepts an optional `summary_statistics` list.
Each entry requires `variable`, `statistic` (free text), numeric `value`, string
`unit`, and `population` (`study` or `study_group`). Use the string `"1"` for
counts or dimensionless results. Zero and negative numerical results are allowed.

Group-specific entries require `study_group_name`, matching exactly one group
in the same study. Whole-study entries omit the group name. Optional
`aggregation_method` describes calculation details, weighting, valid-data rules,
or temporal coverage. Each entry represents one statistic; mean and SD are
separate entries.

```json
{
  "summary_statistics": [
    {
      "variable": "age",
      "statistic": "mean",
      "value": 42.5,
      "unit": "years",
      "population": "study_group",
      "study_group_name": "controls",
      "aggregation_method": "Arithmetic mean of age at enrollment."
    }
  ]
}
```

The builder supports adding and removing entries, study imports, exports, and
saved drafts. The validator checks structure and group references; it does not
recalculate statistics or compare them with participant data. These fields allow
publishing aggregates in metadata independently of access to participant data;
they do not change package resource requirements or access enforcement.
