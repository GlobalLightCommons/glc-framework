const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app.js', 'utf8');
function declaration(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `Missing ${name}`);
  return source.slice(start, source.indexOf('\nfunction ', start + 1));
}
const context = vm.createContext({});
for (const name of ['deviceCalibrationMode', 'setDeviceCalibrationMode', 'isValidCalibrationDate']) {
  vm.runInContext(declaration(name), context);
}
const evaluate = code => vm.runInContext(code, context);
for (const value of ['2024-02-29', '2026-01-15', '0001-01-01']) {
  context.value = value;
  assert(evaluate('isValidCalibrationDate(value)'), value);
}
for (const value of ['', 'unknown', 'uncalibrated', '9999-99-99', '2025-02-29', '2026-04-31', '0000-01-01', null]) {
  context.value = value;
  assert(!evaluate('isValidCalibrationDate(value)'), String(value));
}
context.device = {calibrationDate: ''};
assert.equal(evaluate('deviceCalibrationMode(device)'), '');
evaluate('setDeviceCalibrationMode(device, "uncalibrated")');
assert.equal(context.device.calibrationDate, 'uncalibrated');
assert.equal(evaluate('deviceCalibrationMode(device)'), 'uncalibrated');
const saved = JSON.parse(JSON.stringify(context.device));
context.device = saved;
assert.equal(evaluate('deviceCalibrationMode(device)'), 'uncalibrated');
evaluate('setDeviceCalibrationMode(device, "date")');
assert.equal(context.device.calibrationDate, '');
assert.equal(evaluate('deviceCalibrationMode(device)'), 'date');
context.device.calibrationDate = '2024-02-29';
evaluate('setDeviceCalibrationMode(device, "date")');
assert.equal(context.device.calibrationDate, '2024-02-29');
evaluate('setDeviceCalibrationMode(device, "")');
assert.equal(context.device.calibrationDate, '');
assert.equal(evaluate('deviceCalibrationMode(device)'), '');
// Older drafts and imports preserve their dates and infer the matching control.
context.device = {calibrationDate: '2026-01-15'};
assert.equal(evaluate('deviceCalibrationMode(device)'), 'date');
context.device = {calibrationDate: 'uncalibrated'};
assert.equal(evaluate('deviceCalibrationMode(device)'), 'uncalibrated');
assert(source.includes('An otherwise valid package can still pass. Do not enter an invented date.'));
console.log('Calibration choices, draft round trip, legacy dates, and calendar checks passed.');

context.state = {devices: [], entitySchemas: {device: JSON.parse(fs.readFileSync('schemas/3.2.0/device.schema.json', 'utf8'))}};
context.fields = {schemaVersion: {value: '3.2.0'}};
context.getDatasheetIds = () => ['example-device'];
context.sensorsToText = () => '';
context.parseDeviceSensors = () => [];
context.omitEmptyOptionalEntities = rows => rows;
for (const name of ['isBlank', 'hasAnyValue', 'validationIssue', 'schemaPattern', 'matchesSchemaPattern', 'deviceFromSchema', 'buildDevicesDraft', 'validateDevicesForExport']) {
  vm.runInContext(declaration(name), context);
}
context.imported = {device_internal_id:'D001', device_manufacturer:'Example', device_model:'Model', device_serial_number:'123', device_datasheet_id:'example-device', device_calibration_date:'uncalibrated'};
evaluate('state.devices = [deviceFromSchema(imported)]');
assert.equal(evaluate('deviceCalibrationMode(state.devices[0])'), 'uncalibrated');
assert.equal(evaluate('validateDevicesForExport().length'), 0);
assert.equal(evaluate('buildDevicesDraft()[0].device_calibration_date'), 'uncalibrated');
evaluate('state.devices[0].calibrationDate = ""');
assert(evaluate('validateDevicesForExport().some(issue => issue.message.includes("calibration declaration"))'));
evaluate('state.devices[0].calibrationDate = "9999-99-99"');
assert(evaluate('validateDevicesForExport().some(issue => issue.message.includes("valid calendar date"))'));
evaluate('state.devices[0].calibrationDate = "2024-02-29"');
assert.equal(evaluate('validateDevicesForExport().length'), 0);
console.log('Device import, export, and soft-validation calibration checks passed.');
