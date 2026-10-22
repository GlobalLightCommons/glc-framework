const fs = require("fs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const schema2 = {
  contributor: readJson("schemas/2.0.0/contributor.schema.json"),
  device: readJson("schemas/2.0.0/device.schema.json"),
  datasheet: readJson("schemas/2.0.0/device_datasheet.schema.json"),
};
const schema3 = {
  contributor: readJson("schemas/3.0.2/contributor.schema.json"),
  device: readJson("schemas/3.0.2/device.schema.json"),
  datasheet: readJson("schemas/3.0.2/device_datasheet.schema.json"),
};

assert(schema2.contributor.required.includes("contributor_orcid"), "2.0.0 must require contributor ORCID.");
assert(!schema3.contributor.required.includes("contributor_orcid"), "3.0.2 must leave contributor ORCID optional.");
assert(
  app.includes('contributorRequired.has("contributor_orcid")'),
  "Contributor ORCID requiredness must be read from the active schema.",
);

[
  "datasheet_calibration_interval",
  "datasheet_calibration_spectral_sensitivity",
  "datasheet_calibration_linearity",
  "datasheet_calibration_directional_response",
  "datasheet_channel",
].forEach((field) => {
  assert(
    app.includes(`datasheetRequired.has("${field}")`),
    `${field} requiredness must be read from the active schema.`,
  );
});

assert(
  !schema3.datasheet.required.includes("datasheet_calibration_spectral_sensitivity"),
  "3.0.2 spectral sensitivity must remain optional.",
);
assert(
  !schema3.datasheet.required.includes("datasheet_calibration_linearity"),
  "3.0.2 linearity must remain optional.",
);
assert(
  !schema3.datasheet.required.includes("datasheet_calibration_directional_response"),
  "3.0.2 directional response must remain optional.",
);
assert(
  schema3.datasheet.required.includes("datasheet_channel"),
  "3.0.2 channels must remain required.",
);
assert(
  schema3.datasheet.properties.datasheet_channel.minItems === 1,
  "3.0.2 must require at least one datasheet channel.",
);
assert(
  !schema2.datasheet.required.includes("datasheet_channel"),
  "2.0.0 channels must remain optional.",
);

assert(
  app.includes("const participantFields = new Map("),
  "Participant requiredness must be read from tabular schema constraints.",
);
assert(
  app.includes("const characteristicPrimaryKey = new Set("),
  "Characteristic primary-key fields must drive their UI markers.",
);
assert(
  app.includes("eventBasedOption.disabled = !schema3"),
  "Event-based temporal resolution must be unavailable under 2.0.0.",
);
assert(
  html.includes('id="temporal-resolution-value-required"')
    && html.includes('id="temporal-resolution-unit-required"'),
  "Conditional temporal-resolution markers must be individually controllable.",
);
assert(
  app.includes('return rows;\n}\n\nfunction deviceSensorRowsToText'),
  "Optional device sensors must not create an implicit blank row.",
);

assert(
  schema3.device.properties.device_calibration_date
    && schema3.device.required.includes("device_calibration_date"),
  "3.0.2 calibration date must remain required.",
);

assert(
  html.includes('<option value="3.0.2" selected>3.0.2</option>')
    && !html.includes('<option value="3.0.0"')
    && !html.includes('<option value="2.0.0"'),
  "The builder must offer only schema 3.0.2 for new packages.",
);
assert(
  app.includes('if (version === "2.0.0" || version === "3.0.0" || version === "3.0.1") return "3.0.2";'),
  "Imported schema 2.0.0, 3.0.0, and 3.0.1 work must be upgraded into the 3.0.2 builder workflow.",
);
assert(
  html.includes('href="https://docs.globallightcommons.org/validate/"'),
  "The builder navigation must link to the published dataset validation guide.",
);

console.log("Schema/UI consistency checks passed.");
