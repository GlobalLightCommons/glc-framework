# GLC schema 3.2.0 and validator 0.7.0

Schema 3.2.0 extends 3.1.0 with an explicit calibration declaration. All 3.1.0
metadata-only, recording-duration, contiguity, and summary-statistics rules apply.
Published older bundles are unchanged and remain supported.

## Calibration declaration

The required `device_calibration_date` accepts a valid `YYYY-MM-DD` date or the
exact string `uncalibrated`. Under GLC policy, use uncalibrated whenever an
applicable calibration date cannot be supplied, including missing historical
records. This does not establish that the device was never calibrated.
The builder requires an explicit choice and preserves existing imported dates.

Missing, null, blank, `unknown`, and impossible calendar dates are invalid.
Calendar-date format checking is scoped to the 3.2.0 device schema; older
schema validation and other format checks are not changed by this release.

An uncalibrated declaration is a warning, not a validation failure or a numerical
quality score. One warning is reported per device in the inventory, categorized
as `uncalibrated_devices` in JSON and HTML reports:

> Device D001 is declared uncalibrated. No applicable calibration date was supplied. Under GLC policy, this includes devices whose calibration records are unavailable. Consider this limitation when assessing measurement accuracy.

## Release order

Release and verify validator 0.7.0 before changing the workflow image digest or
making the builder create 3.2.0 packages. Then update the immutable validator pin,
the versioned dataset workflow template, the current schema reference, builder,
and downloads together. Existing packages retain their original schema version;
3.1.0 and earlier cannot use the uncalibrated value without upgrading all schema
references and record versions. Do not overwrite the previous validator image.
