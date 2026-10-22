const FILE_SENSOR_MODALITIES = new Set(["light", "accelerometry", "temperature", "humidity", "air_pollution"]);
const FILE_NON_DEVICE_MODALITIES = new Set(["questionnaire", "diary", "wear_log"]);

const cloneJson = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const valuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isEmptyOptionalValue = (value) => value === null
  || (typeof value === "string" && value.trim() === "")
  || (Array.isArray(value) && value.length === 0)
  || (
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).length === 0
  );

function omitEmptyOptionalProperties(value, schema) {
  if (!schema || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => omitEmptyOptionalProperties(entry, schema.items));
  }
  if (!value || typeof value !== "object") return value;
  const required = new Set(schema.required || []);
  const properties = schema.properties || {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const cleaned = omitEmptyOptionalProperties(entry, properties[key]);
    return !required.has(key) && isEmptyOptionalValue(cleaned) ? [] : [[key, cleaned]];
  }));
}

const omitEmptyOptionalEntities = (rows, schema) => rows.map((row) => omitEmptyOptionalProperties(row, schema));
const createBuilderId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

// Deferred until the schema 3.0.2 metadata workflow is stable and fully tested.
const DATASET_TEMPLATES_ENABLED = false;

const createFileGroup = (name = "Primary file group") => ({
  templateGroupId: "",
  name,
  files: [],
  columns: [],
  modalities: [],
  modalityOther: "",
  modalityOtherType: "",
  instrumentType: "",
  instrumentName: "",
  collectionMethod: "",
  softwareName: "",
  collectionMethodOther: "",
  recordedBy: "",
  recordedByOther: "",
  description: "",
  deviceId: "",
  deviceLocation: "",
  deviceLocationType: "",
  temporalResolutionType: "fixed_interval",
  samplingInterval: "",
  temporalResolutionUnit: "",
  instructions: "",
  delimiter: ",",
  headerRow: "",
  fileFormat: "",
  encoding: "",
  fileTimezone: "",
  auxiliary: "",
  role: "",
  dataState: "",
  preprocessingBol: "",
  preprocessingDesc: "",
  datetimeSource: "column",
  collectionDatetime: "",
  datetimeDate: "",
  datetimeDateformat: "",
  datetimeTime: "",
  datetimeTimeformat: "",
  terms: [{ term: "other", label: "Other" }],
  variableState: {},
});

const createStudyGroup = () => ({ name: "", description: "", size: "", inclusion: "", exclusion: "", datasets: [] });
const createContributor = () => ({
  fullName: "",
  roles: "",
  email: "",
  orcid: "",
  institutionName: "",
  institutionCity: "",
  institutionCountry: "",
});
const createParticipant = () => ({ id: "", age: "", sex: "", gender: "" });
const createCharacteristic = () => ({ participantId: "", name: "", value: "", unit: "", description: "" });
const createDevice = () => ({
  id: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  calibrationDate: "",
  firmwareVersion: "",
  datasheetId: "",
  sensorsText: "",
});
const createDatasheet = () => ({
  id: "",
  version: "",
  manufacturer: "",
  type: "",
  modalities: [],
  modalityOther: "",
  model: "",
  calibrationInterval: "",
  calibrationMethod: "",
  calibrationAccuracy: "",
  calibrationNotes: "",
  calibrationParametersText: "",
  spectralSensitivityText: "",
  linearity: "",
  directionalResponse: "",
  range: "",
  channelsText: "",
});

const createDatasetRecord = () => ({
  datasetId: "",
  studyId: "",
  participantAssociated: true,
  participantId: "",
  deviceId: "",
  deviceLocation: "",
  samplingInterval: "",
  datasetTimezone: "",
  latitude: "",
  longitude: "",
  instructions: "",
  templateId: "",
  excludedTemplateGroupIds: [],
  fileGroups: [createFileGroup()],
});

const FALLBACK_TIME_ZONES = [
  "UTC",
  "Etc/UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Rome",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

const initialDataset = createDatasetRecord();

const state = {
  activeStep: "start",
  activeDatasetIndex: 0,
  activeGroupIndex: 0,
  studyGroups: [],
  contributors: [],
  participants: [createParticipant()],
  characteristics: [],
  devices: [createDevice()],
  datasheets: [createDatasheet()],
  datasheetImportedFiles: [],
  datasets: [initialDataset],
  datasetTemplates: [],
  templateDraft: createDatasetRecord(),
  activeTemplateEditorId: "",
  fileGroups: initialDataset.fileGroups,
  supportedTimeZones: [],
  supportedTimeZoneSet: new Set(),
  entitySchemas: {},
};

const fileInput = document.querySelector("#file-input");
const fileSummary = document.querySelector("#file-summary");
const fileWarning = document.querySelector("#file-warning");
const timezoneOptions = document.querySelector("#timezone-options");
const variablesTable = document.querySelector("#variables-table");
const termsList = document.querySelector("#terms-list");
const datasetRecordsList = document.querySelector("#dataset-records-list");
const fileGroupsList = document.querySelector("#file-groups-list");
const validationSummary = document.querySelector("#validation-summary");
const datasetImport = document.querySelector("#dataset-import");
const importDatasetButton = document.querySelector("#import-dataset-button");
const datasetImportFile = document.querySelector("#dataset-import-file");
const datasetImportSummary = document.querySelector("#dataset-import-summary");
const jsonPreview = document.querySelector("#json-preview");
const previewTitle = document.querySelector("#preview-title");
const workspace = document.querySelector(".workspace");
const builderPanel = document.querySelector(".builder-panel");
const previewPanel = document.querySelector(".preview-panel");
const packageSummary = document.querySelector("#package-summary");
const exportValidationPanel = document.querySelector("#export-validation-panel");
const packageFolderImport = document.querySelector("#package-folder-import");
const importPackageFolderButton = document.querySelector("#import-package-folder-button");
const packageFolderImportFile = document.querySelector("#package-folder-import-file");
const packageFolderImportSummary = document.querySelector("#package-folder-import-summary");
const removePackageFolderImportButton = document.querySelector("#remove-package-folder-import");
const builderProjectImport = document.querySelector("#builder-project-import");
const builderProjectImportStatus = document.querySelector("#builder-project-import-status");
const sectionValidationPanels = {
  study: document.querySelector("#study-validation-panel"),
  participants: document.querySelector("#participants-validation-panel"),
  devices: document.querySelector("#devices-validation-panel"),
  datasets: document.querySelector("#datasets-validation-panel"),
};
const downloadButton = document.querySelector("#download-json");
const addTermButton = document.querySelector("#add-term");
const addDatasetRecordButton = document.querySelector("#add-dataset-record");
const addFileGroupButton = document.querySelector("#add-file-group");
const datasetTemplateName = document.querySelector("#dataset-template-name");
const datasetTemplateSelect = document.querySelector("#dataset-template-select");
const datasetTemplateStatus = document.querySelector("#dataset-template-status");
const datasetTemplateSaveStatus = document.querySelector("#dataset-template-save-status");
const datasetTemplateParticipants = document.querySelector("#dataset-template-participants");
const excludedTemplateGroupSelect = document.querySelector("#excluded-template-group-select");
const templateEditorSelect = document.querySelector("#template-editor-select");
const templateEditorStatus = document.querySelector("#template-editor-status");
const studyImport = document.querySelector("#study-import");
const importStudyButton = document.querySelector("#import-study-button");
const studyImportFile = document.querySelector("#study-import-file");
const studyImportSummary = document.querySelector("#study-import-summary");
const contributorsImport = document.querySelector("#contributors-import");
const importContributorsButton = document.querySelector("#import-contributors-button");
const contributorsImportFile = document.querySelector("#contributors-import-file");
const contributorsImportSummary = document.querySelector("#contributors-import-summary");
const clearContributorsImportButton = document.querySelector("#clear-contributors-import");
const studyGroupsList = document.querySelector("#study-groups-list");
const contributorsList = document.querySelector("#contributors-list");
const participantsImport = document.querySelector("#participants-import");
const importParticipantsButton = document.querySelector("#import-participants-button");
const participantsImportFile = document.querySelector("#participants-import-file");
const participantsImportSummary = document.querySelector("#participants-import-summary");
const characteristicsImport = document.querySelector("#characteristics-import");
const importCharacteristicsButton = document.querySelector("#import-characteristics-button");
const characteristicsImportFile = document.querySelector("#characteristics-import-file");
const characteristicsImportSummary = document.querySelector("#characteristics-import-summary");
const participantsList = document.querySelector("#participants-list");
const characteristicsList = document.querySelector("#characteristics-list");
const devicesImport = document.querySelector("#devices-import");
const importDevicesButton = document.querySelector("#import-devices-button");
const devicesImportFile = document.querySelector("#devices-import-file");
const devicesImportSummary = document.querySelector("#devices-import-summary");
const devicesList = document.querySelector("#devices-list");
const datasheetsImport = document.querySelector("#datasheets-import");
const importDatasheetsButton = document.querySelector("#import-datasheets-button");
const datasheetsImportFile = document.querySelector("#datasheets-import-file");
const datasheetsImportSummary = document.querySelector("#datasheets-import-summary");
const datasheetsList = document.querySelector("#datasheets-list");

const fields = {
  schemaVersion: document.querySelector("#schema-version"),
  packageName: document.querySelector("#package-name"),
  packageTitle: document.querySelector("#package-title"),
  studyInternalId: document.querySelector("#study-internal-id"),
  studyTitle: document.querySelector("#study-title"),
  studyPreregistration: document.querySelector("#study-preregistration"),
  studyRegistration: document.querySelector("#study-registration"),
  studyType: document.querySelector("#study-type"),
  studyShortDescription: document.querySelector("#study-short-description"),
  studySample: document.querySelector("#study-sample"),
  studySetting: document.querySelector("#study-setting"),
  studyGeographicalLocation: document.querySelector("#study-geographical-location"),
  studyEthics: document.querySelector("#study-ethics"),
  studyIntervention: document.querySelector("#study-intervention"),
  studyFundingSources: document.querySelector("#study-funding-sources"),
  studyKeywords: document.querySelector("#study-keywords"),
  studyDatasetsPreview: document.querySelector("#study-datasets-preview"),
  datasetId: document.querySelector("#dataset-id"),
  studyId: document.querySelector("#study-id"),
  participantAssociated: document.querySelector("#participant-associated"),
  participantId: document.querySelector("#participant-id"),
  fileModality: document.querySelector("#file-modality-field"),
  fileModalityOther: document.querySelector("#file-modality-other"),
  fileModalityOtherType: document.querySelector("#file-modality-other-type"),
  fileInstrumentType: document.querySelector("#file-instrument-type"),
  fileInstrumentName: document.querySelector("#file-instrument-name"),
  fileCollectionMethod: document.querySelector("#file-collection-method"),
  fileSoftwareName: document.querySelector("#file-software-name"),
  fileCollectionMethodOther: document.querySelector("#file-collection-method-other"),
  fileRecordedBy: document.querySelector("#file-recorded-by"),
  fileRecordedByOther: document.querySelector("#file-recorded-by-other"),
  fileDescription: document.querySelector("#file-description"),
  deviceId: document.querySelector("#device-id"),
  deviceLocation: document.querySelector("#device-location"),
  deviceLocationType: document.querySelector("#device-location-type"),
  temporalResolutionType: document.querySelector("#temporal-resolution-type"),
  samplingInterval: document.querySelector("#sampling-interval"),
  temporalResolutionUnit: document.querySelector("#temporal-resolution-unit"),
  datasetTimezone: document.querySelector("#dataset-timezone"),
  latitude: document.querySelector("#latitude"),
  longitude: document.querySelector("#longitude"),
  instructions: document.querySelector("#instructions"),
  datetimeSource: document.querySelector("#datetime-source"),
  collectionDatetime: document.querySelector("#collection-datetime"),
  datetimeDate: document.querySelector("#datetime-date"),
  datetimeDateformat: document.querySelector("#datetime-dateformat"),
  datetimeTime: document.querySelector("#datetime-time"),
  datetimeTimeformat: document.querySelector("#datetime-timeformat"),
  fileFormat: document.querySelector("#file-format"),
  encoding: document.querySelector("#encoding"),
  headerRow: document.querySelector("#header-row"),
  fileTimezone: document.querySelector("#file-timezone"),
  auxiliary: document.querySelector("#auxiliary"),
  fileRole: document.querySelector("#file-role"),
  dataState: document.querySelector("#data-state"),
  preprocessingBol: document.querySelector("#preprocessing-bol"),
  preprocessingDesc: document.querySelector("#preprocessing-desc"),
};

const DRAFT_STORAGE_KEY = "glc-metadata-builder:draft:v2";
const PROJECT_FIELD_KEYS = [
  "schemaVersion",
  "packageName",
  "packageTitle",
  "studyInternalId",
  "studyTitle",
  "studyPreregistration",
  "studyRegistration",
  "studyType",
  "studyShortDescription",
  "studySample",
  "studySetting",
  "studyGeographicalLocation",
  "studyEthics",
  "studyIntervention",
  "studyFundingSources",
  "studyKeywords",
];
let autosaveReady = false;
let autosaveTimer = null;
let draftDirtySinceBackup = false;
let restoringDraft = false;

fileInput.addEventListener("change", handleFileSelection);
studyImport.addEventListener("change", () => handleMetadataFileSelection(studyImport, studyImportFile, studyImportSummary, "study file", "Import selected study file"));
importStudyButton.addEventListener("click", () => {
  const file = studyImport.files?.[0];
  if (!file) {
    studyImportSummary.textContent = "Choose a study.json file first, then click Import.";
    studyImportSummary.className = "import-summary warning";
    return;
  }
  handleStudyImport({ target: studyImport });
});
contributorsImport.addEventListener("change", () => handleMetadataFileSelection(contributorsImport, contributorsImportFile, contributorsImportSummary, "contributor file", "Import selected contributor file"));
importContributorsButton.addEventListener("click", () => {
  const file = contributorsImport.files?.[0];
  if (!file) {
    contributorsImportSummary.textContent = "Choose a contributors JSON/CSV/TSV file first, then click Import.";
    contributorsImportSummary.className = "import-summary warning";
    return;
  }
  handleContributorsImport({ target: contributorsImport });
});
participantsImport.addEventListener("change", () => handleMetadataFileSelection(participantsImport, participantsImportFile, participantsImportSummary, "participants file", "Import selected participants file"));
importParticipantsButton.addEventListener("click", () => {
  const file = participantsImport.files?.[0];
  if (!file) {
    participantsImportSummary.textContent = "Choose a participants JSON/CSV/TSV file first, then click Import.";
    participantsImportSummary.className = "import-summary warning";
    return;
  }
  handleParticipantsImport({ target: participantsImport });
});
characteristicsImport.addEventListener("change", () => handleMetadataFileSelection(characteristicsImport, characteristicsImportFile, characteristicsImportSummary, "characteristics file", "Import selected characteristics file"));
importCharacteristicsButton.addEventListener("click", () => {
  const file = characteristicsImport.files?.[0];
  if (!file) {
    characteristicsImportSummary.textContent = "Choose a participant characteristics JSON/CSV/TSV file first, then click Import.";
    characteristicsImportSummary.className = "import-summary warning";
    return;
  }
  handleCharacteristicsImport({ target: characteristicsImport });
});
devicesImport.addEventListener("change", () => handleMetadataFileSelection(devicesImport, devicesImportFile, devicesImportSummary, "devices file", "Import selected devices file"));
importDevicesButton.addEventListener("click", () => {
  const file = devicesImport.files?.[0];
  if (!file) {
    devicesImportSummary.textContent = "Choose a devices JSON/CSV/TSV file first, then click Import.";
    devicesImportSummary.className = "import-summary warning";
    return;
  }
  importDevicesFile(file);
});
datasheetsImport.addEventListener("change", () => handleMetadataFilesSelection(datasheetsImport, datasheetsImportFile, datasheetsImportSummary, "datasheet file(s)", "Import selected datasheet file(s)"));
importDatasheetsButton.addEventListener("click", () => {
  const files = Array.from(datasheetsImport.files || []);
  if (files.length === 0) {
    datasheetsImportSummary.textContent = "Choose datasheet JSON/CSV/TSV file(s) first, then click Import.";
    datasheetsImportSummary.className = "import-summary warning";
    return;
  }
  importDatasheetsFiles(files);
});
datasetImport.addEventListener("change", () => handleMetadataFileSelection(datasetImport, datasetImportFile, datasetImportSummary, "dataset file", "Import selected dataset file"));
importDatasetButton.addEventListener("click", () => {
  const file = datasetImport.files?.[0];
  if (!file) {
    datasetImportSummary.textContent = "Choose a datasets.json file first, then click Import.";
    datasetImportSummary.className = "import-summary warning";
    return;
  }
  importDatasetFile(file);
});
clearContributorsImportButton.addEventListener("click", clearContributorsImport);
downloadButton.addEventListener("click", () => downloadText("datasets.json", JSON.stringify(buildDatasetDraft(), null, 2), "application/json"));
addTermButton.addEventListener("click", addTerm);
addDatasetRecordButton.addEventListener("click", addDatasetRecord);
addFileGroupButton.addEventListener("click", addFileGroup);
document.querySelector("#save-dataset-template").addEventListener("click", saveActiveDatasetAsTemplate);
document.querySelector("#create-linked-dataset").addEventListener("click", createLinkedDatasetFromTemplate);
document.querySelector("#update-dataset-template").addEventListener("click", updateSelectedDatasetTemplate);
document.querySelector("#detach-dataset-template").addEventListener("click", detachActiveDatasetFromTemplate);
document.querySelector("#restore-template-group").addEventListener("click", restoreExcludedTemplateGroup);
datasetTemplateSelect.addEventListener("change", renderDatasetTemplateTools);
templateEditorSelect.addEventListener("change", () => {
  if (templateEditorSelect.value) loadTemplateDraft(templateEditorSelect.value);
  else startNewTemplateDraft();
});
document.querySelector("#add-study-group").addEventListener("click", addStudyGroup);
document.querySelector("#add-contributor").addEventListener("click", addContributor);
document.querySelector("#clear-all-contributors").addEventListener("click", () => clearAllContributors());
document.querySelector("#clear-study-page").addEventListener("click", clearStudyPage);
document.querySelector("#add-participant").addEventListener("click", addParticipant);
document.querySelector("#clear-all-participants").addEventListener("click", () => clearAllParticipants());
document.querySelector("#remove-participants-import").addEventListener("click", () => clearAllParticipants("Imported participants file removed. Add rows manually or import another file."));
document.querySelector("#add-characteristic").addEventListener("click", addCharacteristic);
document.querySelector("#clear-all-characteristics").addEventListener("click", () => clearAllCharacteristics());
document.querySelector("#remove-characteristics-import").addEventListener("click", () => clearAllCharacteristics("Imported characteristics file removed. Add rows manually or import another file."));
document.querySelector("#clear-participants-page").addEventListener("click", clearParticipantsPage);
document.querySelector("#add-device").addEventListener("click", addDevice);
document.querySelector("#clear-all-devices").addEventListener("click", () => clearAllDevices());
document.querySelector("#remove-devices-import").addEventListener("click", () => clearAllDevices("Imported devices file removed. Add rows manually or import another file."));
document.querySelector("#clear-devices-page").addEventListener("click", clearDevicesPage);
document.querySelector("#add-datasheet").addEventListener("click", addDatasheet);
document.querySelector("#clear-all-datasheets").addEventListener("click", () => clearAllDatasheets());
document.querySelector("#remove-datasheets-import").addEventListener("click", () => clearAllDatasheets("Imported datasheet file removed. Add rows manually or import another file."));
document.querySelector("#clear-datasheets-page").addEventListener("click", clearDatasheetsPage);
document.querySelector("#remove-dataset-import").addEventListener("click", () => clearDatasetPage("Imported dataset file removed. Add data manually or import another datasets.json file."));
document.querySelector("#clear-dataset-page").addEventListener("click", () => clearDatasetPage());
packageFolderImport.addEventListener("change", handlePackageFolderSelection);
builderProjectImport.addEventListener("change", importBuilderProjectFile);
importPackageFolderButton.addEventListener("click", () => {
  const files = Array.from(packageFolderImport.files || []);
  if (files.length === 0) {
    packageFolderImportSummary.textContent = "Choose a metadata package folder first, then click Import.";
    packageFolderImportSummary.className = "import-summary warning";
    return;
  }
  importPackageFolder(files);
});
removePackageFolderImportButton.addEventListener("click", clearPackageFolderImport);
document.querySelector("#download-package-zip").addEventListener("click", downloadPackageZip);
document.querySelector("#download-builder-project").addEventListener("click", downloadBuilderProjectBackup);
document.querySelector("#download-builder-project-header").addEventListener("click", downloadBuilderProjectBackup);
document.querySelector("#start-over-header").addEventListener("click", startOver);
document.querySelector("#download-datapackage").addEventListener("click", () => downloadText("datapackage.json", JSON.stringify(buildDataPackage(), null, 2), "application/json"));
document.querySelector("#download-study").addEventListener("click", () => downloadText("study.json", JSON.stringify(buildStudyDraft(), null, 2), "application/json"));
document.querySelector("#download-participants").addEventListener("click", () => downloadText("participants.csv", buildParticipantsCsv(), "text/csv"));
document.querySelector("#download-characteristics").addEventListener("click", () => downloadText("participant_characteristics.csv", buildCharacteristicsCsv(), "text/csv"));
document.querySelector("#download-devices").addEventListener("click", () => downloadText("devices.json", JSON.stringify(buildDevicesDraft(), null, 2), "application/json"));
document.querySelector("#download-datasheets").addEventListener("click", () => downloadText("device_datasheet.json", JSON.stringify(buildDatasheetsDraft(), null, 2), "application/json"));
document.querySelector("#download-study-metadata").addEventListener("click", () => downloadText("study.json", JSON.stringify(buildStudyDraft(), null, 2), "application/json"));
document.querySelector("#download-participants-metadata").addEventListener("click", () => downloadText("participants.csv", buildParticipantsCsv(), "text/csv"));
document.querySelector("#download-characteristics-metadata").addEventListener("click", () => downloadText("participant_characteristics.csv", buildCharacteristicsCsv(), "text/csv"));
document.querySelector("#download-devices-metadata").addEventListener("click", () => downloadText("devices.json", JSON.stringify(buildDevicesDraft(), null, 2), "application/json"));
document.querySelector("#download-datasheets-metadata").addEventListener("click", () => downloadText("device_datasheet.json", JSON.stringify(buildDatasheetsDraft(), null, 2), "application/json"));
document.querySelector("#download-datasets-metadata").addEventListener("click", () => downloadText("datasets.json", JSON.stringify(buildDatasetDraft(), null, 2), "application/json"));
document.querySelector("#download-study-schema").addEventListener("click", () => downloadSchema("study.schema.json"));
document.querySelector("#download-contributor-schema").addEventListener("click", () => downloadSchema("contributor.schema.json"));
document.querySelector("#download-participants-schema").addEventListener("click", () => downloadSchema("participants.schema.json"));
document.querySelector("#download-characteristics-schema").addEventListener("click", () => downloadSchema("participant_characteristics.schema.json"));
document.querySelector("#download-device-schema").addEventListener("click", () => downloadSchema("device.schema.json"));
document.querySelector("#download-datasheet-schema").addEventListener("click", () => downloadSchema("device_datasheet.schema.json"));
document.querySelector("#download-dataset-schema").addEventListener("click", () => downloadSchema("dataset.schema.json"));

document.querySelectorAll("[data-next-step]").forEach((button) => {
  button.addEventListener("click", () => setStep(button.dataset.nextStep));
});
document.querySelectorAll("[data-prev-step]").forEach((button) => {
  button.addEventListener("click", () => setStep(button.dataset.prevStep));
});
document.querySelectorAll("[data-step-link]").forEach((item) => {
  item.addEventListener("click", () => setStep(item.dataset.stepLink));
});
document.querySelectorAll("[data-subsection-target]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setStep(button.dataset.subsectionStep);
    requestAnimationFrame(() => {
      document.querySelector(`#${button.dataset.subsectionTarget}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
});

document.addEventListener("click", handleHelpMarkerClick);
document.addEventListener("keydown", handleHelpMarkerKeydown);
document.addEventListener("keydown", handleGlobalHelpTooltipKeydown);
document.addEventListener("pointerdown", closeHelpTooltipOnOutsidePointer);

Object.values(fields).forEach((field) => {
  field.addEventListener("input", handleFormInput);
  field.addEventListener("change", handleFormChange);
});

function getHelpTooltip() {
  let tooltip = document.querySelector("#help-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "help-tooltip";
    tooltip.className = "help-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function getHelpMarkerText(marker) {
  return marker.dataset.helpText || marker.getAttribute("title") || marker.getAttribute("aria-label") || "";
}

function prepareHelpMarker(marker) {
  if (!marker.dataset.helpText) {
    const helpText = getHelpMarkerText(marker);
    marker.dataset.helpText = helpText;
    marker.setAttribute("aria-label", helpText);
  }
  if (!marker.hasAttribute("role")) {
    marker.setAttribute("role", "button");
  }
  if (!marker.hasAttribute("tabindex")) {
    marker.setAttribute("tabindex", "0");
  }
}

function showHelpTooltip(marker) {
  prepareHelpMarker(marker);
  const helpText = getHelpMarkerText(marker);
  if (!helpText) {
    return;
  }
  const tooltip = getHelpTooltip();
  tooltip.textContent = helpText;
  tooltip.hidden = false;

  const markerRect = marker.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportPadding = 12;
  const top = window.scrollY + markerRect.bottom + 8;
  const preferredLeft = window.scrollX + markerRect.left + markerRect.width / 2 - tooltipRect.width / 2;
  const maxLeft = window.scrollX + window.innerWidth - tooltipRect.width - viewportPadding;
  const left = Math.max(window.scrollX + viewportPadding, Math.min(preferredLeft, maxLeft));

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  marker.setAttribute("aria-expanded", "true");
  marker.setAttribute("aria-describedby", "help-tooltip");
}

function hideHelpTooltip() {
  const tooltip = document.querySelector("#help-tooltip");
  if (!tooltip || tooltip.hidden) {
    return;
  }
  tooltip.hidden = true;
  document.querySelectorAll(".help-marker[aria-expanded='true']").forEach((marker) => {
    marker.removeAttribute("aria-expanded");
    marker.removeAttribute("aria-describedby");
  });
}

function handleHelpMarkerClick(event) {
  const marker = event.target.closest(".help-marker");
  if (!marker) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const tooltip = getHelpTooltip();
  const isOpen = !tooltip.hidden && marker.getAttribute("aria-expanded") === "true";
  hideHelpTooltip();
  if (!isOpen) {
    showHelpTooltip(marker);
  }
}

function handleHelpMarkerKeydown(event) {
  const marker = event.target.closest(".help-marker");
  if (!marker || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }
  event.preventDefault();
  marker.click();
}

function handleGlobalHelpTooltipKeydown(event) {
  if (event.key === "Escape") {
    hideHelpTooltip();
  }
}

function closeHelpTooltipOnOutsidePointer(event) {
  if (event.target.closest(".help-marker") || event.target.closest("#help-tooltip")) {
    return;
  }
  hideHelpTooltip();
}

document.querySelectorAll(".help-marker").forEach(prepareHelpMarker);

function handleFormInput() {
  syncDatasetControlsIfNeeded();
  syncParticipantAssociationControls();
  syncDeviceLocationTypeControls();
  syncTemporalResolutionControls();
  syncFileModalityControls();
  syncFileRoleDataStateControls();
  updateCrossrefOptions();
  syncDatetimeControls();
  renderDatasetRecords();
  updatePreview();
}

function handleFormChange(event) {
  if (event?.target === fields.schemaVersion) {
    loadSchemaHelp(fields.schemaVersion.value);
  }
  syncDatasetControlsIfNeeded();
  syncParticipantAssociationControls();
  syncDeviceLocationTypeControls();
  syncTemporalResolutionControls();
  syncFileModalityControls();
  syncFileRoleDataStateControls();
  updateCrossrefOptions();
  syncDatetimeControls();
  renderDatasetRecords();
  renderVariables();
  updatePreview();
}

function setStep(step) {
  if (step === "templates" && !DATASET_TEMPLATES_ENABLED) step = "datasets";
  if (state.activeStep === "datasets" || state.activeStep === "templates") {
    syncActiveDatasetFromControls();
  } else {
    syncActiveGroupFromControls();
  }
  state.activeStep = step;
  document.querySelectorAll(".builder-step").forEach((section) => {
    section.classList.toggle("active", section.dataset.step === step);
  });
  document.querySelectorAll("[data-step-link]").forEach((item) => {
    item.classList.toggle("active", item.dataset.stepLink === step);
  });
  placeDatasetEditor(step);
  updateCrossrefOptions();
  if (step === "datasets" || step === "templates") {
    state.fileGroups = activeDataset().fileGroups;
    state.activeGroupIndex = Math.min(state.activeGroupIndex, state.fileGroups.length - 1);
    syncControlsFromActiveDataset();
    placeDatasetEditor(step);
  }
  renderTemplateEditorControls();
  updatePreview();
}

function activeDataset() {
  if (state.activeStep === "templates") return state.templateDraft;
  return state.datasets[state.activeDatasetIndex];
}

function activeGroup() {
  return state.fileGroups[state.activeGroupIndex];
}

function syncDatasetControlsIfNeeded() {
  if (state.activeStep === "datasets" || state.activeStep === "templates") {
    syncActiveDatasetFromControls();
  }
}

function placeDatasetEditor(step) {
  const workspace = document.querySelector("#dataset-editor-workspace");
  const destination = step === "templates"
    ? document.querySelector("#template-editor-host")
    : document.querySelector("#dataset-editor-home");
  if (workspace && destination && workspace.parentElement !== destination) destination.appendChild(workspace);
  const templateMode = step === "templates";
  ["#dataset-id-field", "#dataset-participant-id-field"].forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) element.hidden = templateMode;
  });
  const participantAssociation = document.querySelector("#participant-associated-field");
  if (participantAssociation && templateMode) {
    participantAssociation.hidden = !String(fields.schemaVersion.value || "3.0.2").startsWith("3.");
  }
}

function startNewTemplateDraft() {
  if (state.activeStep === "templates") syncActiveDatasetFromControls();
  state.activeTemplateEditorId = "";
  state.templateDraft = createDatasetRecord();
  state.templateDraft.studyId = getStudyId();
  state.fileGroups = state.templateDraft.fileGroups;
  state.activeGroupIndex = 0;
  syncControlsFromActiveDataset();
  placeDatasetEditor("templates");
  renderTemplateEditorControls();
  renderDatasetTemplateTools();
  updatePreview();
}

function loadTemplateDraft(templateId) {
  if (state.activeStep === "templates") syncActiveDatasetFromControls();
  const template = state.datasetTemplates.find((entry) => entry.templateId === templateId);
  state.activeTemplateEditorId = template?.templateId || "";
  state.templateDraft = template ? cloneJson(template.dataset) : createDatasetRecord();
  state.templateDraft.templateId = template?.templateId || "";
  state.fileGroups = state.templateDraft.fileGroups;
  state.activeGroupIndex = 0;
  syncControlsFromActiveDataset();
  placeDatasetEditor("templates");
  renderTemplateEditorControls();
  renderDatasetTemplateTools();
  updatePreview();
}

function renderTemplateEditorControls() {
  if (!templateEditorSelect) return;
  templateEditorSelect.innerHTML = '<option value="">Create a new template</option>'
    + state.datasetTemplates.map((template) => `<option value="${escapeHtml(template.templateId)}">${escapeHtml(template.name)}</option>`).join("");
  templateEditorSelect.value = state.activeTemplateEditorId;
  if (state.activeStep === "templates") {
    const template = state.datasetTemplates.find((entry) => entry.templateId === state.activeTemplateEditorId);
    templateEditorStatus.innerHTML = template
      ? `<strong>Editing:</strong> ${escapeHtml(template.name)}. Changes are saved only when you select Update template below.`
      : "<strong>Creating a new template.</strong> Configure it below and save it at the end of this page, or select a saved template to edit.";
  }
}

function syncParticipantAssociationControls() {
  const schema3 = String(fields.schemaVersion.value || "3.0.2").startsWith("3.");
  const associated = fields.participantAssociated.value !== "false";
  document.querySelector("#participant-associated-field").hidden = !schema3;
  fields.participantId.disabled = schema3 && !associated;
  fields.participantId.required = !schema3 || associated;
  document.querySelector("#participant-id-required").hidden = schema3 && !associated;
  if (schema3 && !associated) {
    fields.participantId.value = "";
    const dataset = activeDataset();
    if (dataset) dataset.participantId = "";
  }
}

function syncActiveDatasetFromControls() {
  const dataset = activeDataset();
  if (!dataset) {
    return;
  }
  syncActiveGroupFromControls();
  dataset.datasetId = fields.datasetId.value.trim();
  dataset.studyId = fields.studyId.value;
  dataset.participantAssociated = fields.participantAssociated.value !== "false";
  dataset.participantId = fields.participantId.value;
  if (!String(fields.schemaVersion.value || "3.0.2").startsWith("3.")) {
    dataset.deviceId = fields.deviceId.value;
    dataset.deviceLocation = fields.deviceLocation.value.trim();
    dataset.samplingInterval = fields.samplingInterval.value;
    dataset.instructions = fields.instructions.value.trim();
  }
  dataset.datasetTimezone = fields.datasetTimezone.value.trim();
  dataset.latitude = fields.latitude.value.trim();
  dataset.longitude = fields.longitude.value.trim();
  dataset.fileGroups = state.fileGroups;
}

function syncControlsFromActiveDataset() {
  const dataset = activeDataset();
  if (!dataset) {
    return;
  }

  fields.datasetId.value = dataset.datasetId || "";
  setPendingSelectValue(fields.studyId, dataset.studyId || "");
  fields.participantAssociated.value = String(dataset.participantAssociated !== false);
  setPendingSelectValue(fields.participantId, dataset.participantId || "");
  syncParticipantAssociationControls();
  fields.datasetTimezone.value = dataset.datasetTimezone || "";
  fields.latitude.value = dataset.latitude || "";
  fields.longitude.value = dataset.longitude || "";

  state.fileGroups = dataset.fileGroups?.length ? dataset.fileGroups : [createFileGroup()];
  dataset.fileGroups = state.fileGroups;
  state.activeGroupIndex = Math.min(state.activeGroupIndex, state.fileGroups.length - 1);
  if (state.activeGroupIndex < 0) {
    state.activeGroupIndex = 0;
  }

  syncControlsFromActiveGroup();
  renderDatasetRecords();
  renderFileGroups();
  renderTerms();
  renderVariables();
  updateCrossrefOptions();
}

function getStudyId() {
  return fields.studyInternalId.value.trim();
}

function getParticipantIds() {
  return state.participants.map((entry) => entry.id).filter(Boolean);
}

function getDeviceIds() {
  return state.devices.map((entry) => entry.id).filter(Boolean);
}

function getDatasheetIds() {
  return state.datasheets.map((entry) => entry.id).filter(Boolean);
}

function getSeparateSensorDatasheetIds() {
  const wholeDeviceDatasheetIds = new Set(
    state.devices.map((entry) => entry.datasheetId).filter(Boolean)
  );
  return getDatasheetIds().filter((id) => !wholeDeviceDatasheetIds.has(id));
}

function updateCrossrefOptions() {
  setSelectOptions(fields.studyId, Array.from(new Set([getStudyId(), fields.studyId.value].filter(Boolean))), "Add study ID first");
  setSelectOptions(fields.participantId, Array.from(new Set([...getParticipantIds(), fields.participantId.value].filter(Boolean))), "Add participant first");
  setSelectOptions(fields.deviceId, Array.from(new Set([...getDeviceIds(), fields.deviceId.value].filter(Boolean))), "Add device first");
  document.querySelectorAll(".participant-select").forEach((select) => {
    setSelectOptions(select, Array.from(new Set([...getParticipantIds(), select.value].filter(Boolean))), "Select participant");
  });
  document.querySelectorAll(".datasheet-select").forEach((select) => {
    setSelectOptions(select, Array.from(new Set([...getDatasheetIds(), select.value].filter(Boolean))), "Select datasheet");
  });
}

function setSelectOptions(select, values, placeholder) {
  const previous = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
  if (values.includes(previous)) {
    select.value = previous;
  } else if (values.length === 1) {
    select.value = values[0];
  }
}

function getSupportedTimeZones() {
  const timeZones = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : FALLBACK_TIME_ZONES;
  return Array.from(new Set([...timeZones, "UTC", "Etc/UTC"])).sort();
}

function initializeTimeZoneOptions() {
  state.supportedTimeZones = getSupportedTimeZones();
  state.supportedTimeZoneSet = new Set(state.supportedTimeZones);
  if (!timezoneOptions) {
    return;
  }
  timezoneOptions.innerHTML = state.supportedTimeZones
    .map((timeZone) => `<option value="${escapeHtml(timeZone)}"></option>`)
    .join("");
}

function clearStudyPage() {
  [
    fields.studyInternalId,
    fields.studyTitle,
    fields.studyPreregistration,
    fields.studyRegistration,
    fields.studyEthics,
    fields.studyType,
    fields.studyShortDescription,
    fields.studySample,
    fields.studySetting,
    fields.studyGeographicalLocation,
    fields.studyIntervention,
    fields.studyFundingSources,
    fields.studyKeywords,
  ].forEach((field) => {
    field.value = "";
  });

  state.studyGroups = [];
  state.contributors = [];
  studyImport.value = "";
  contributorsImport.value = "";
  hideImportFile(studyImportFile);
  hideImportFile(contributorsImportFile);
  studyImportSummary.textContent = "Optional: import an existing study.json to pre-fill this page.";
  studyImportSummary.className = "";
  contributorsImportSummary.textContent = "Study contributors cleared. Add rows manually or import CSV/TSV/JSON.";
  contributorsImportSummary.className = "import-summary";

  renderStudyGroups();
  renderContributors();
  updateCrossrefOptions();
  updatePreview();
}

function syncActiveSchemaPill(schemaVersion = fields.schemaVersion.value || "3.0.2") {
  const pill = document.querySelector("#active-schema-pill");
  if (!pill) return;
  const isCurrentSchema = schemaVersion === "3.0.2";
  const profileFilename = schemaVersion === "3.0.2"
    ? "glc-dp-profile.json"
    : "gleam-dp-profile.json";
  pill.textContent = `Schema ${schemaVersion}`;
  pill.href = `https://github.com/tscnlab/glc-metadata-validator/blob/main/schemas/${schemaVersion}/${profileFilename}`;
  pill.setAttribute("aria-label", `View GLC schema ${schemaVersion}`);
  pill.classList.toggle("schema-pill-current", isCurrentSchema);
  pill.classList.toggle("schema-pill-legacy", !isCurrentSchema);
  pill.title = isCurrentSchema
    ? `Current GLC schema version: ${schemaVersion}`
    : `Legacy GLC schema version: ${schemaVersion}`;
}

function normalizeBuilderSchemaVersion(schemaVersion) {
  const version = String(schemaVersion || "").trim();
  if (version === "2.0.0" || version === "3.0.0" || version === "3.0.1") return "3.0.2";
  if (version === "3.0.2") return version;
  return "3.0.2";
}

async function loadSchemaHelp(schemaVersion = fields.schemaVersion.value || "3.0.2") {
  syncActiveSchemaPill(schemaVersion);
  try {
    const [studySchema, contributorSchema, participantsSchema, characteristicsSchema, deviceSchema, datasheetSchema, datasetSchema] = await Promise.all([
      fetch(`schemas/${schemaVersion}/study.schema.json`).then((response) => response.json()),
      fetch(`schemas/${schemaVersion}/contributor.schema.json`).then((response) => response.json()),
      fetch(`schemas/${schemaVersion}/participants.schema.json`).then((response) => response.json()),
      fetch(`schemas/${schemaVersion}/participant_characteristics.schema.json`).then((response) => response.json()),
      fetch(`schemas/${schemaVersion}/device.schema.json`).then((response) => response.json()),
      fetch(`schemas/${schemaVersion}/device_datasheet.schema.json`).then((response) => response.json()),
      fetch(`schemas/${schemaVersion}/dataset.schema.json`).then((response) => response.json()),
    ]);
    state.entitySchemas = {
      study: studySchema,
      contributor: contributorSchema,
      participants: participantsSchema,
      characteristics: characteristicsSchema,
      device: deviceSchema,
      datasheet: datasheetSchema,
      dataset: datasetSchema,
    };

    applySchemaHelp(studySchema, {
      "study-internal-id": "study_internal_id",
      "study-title": "study_title",
      "study-preregistration": "study_preregistration",
      "study-registration": "study_registration",
      "study-ethics": "study_ethics",
      "study-type": "study_type",
      "study-short-description": "study_short_description",
      "study-sample": "study_sample",
      "study-setting": "study_setting",
      "study-geographical-location": "study_geographical_location",
      "study-intervention": "study_intervention",
      "study-funding-sources": "study_funding_sources",
      "study-keywords": "study_keywords",
      "study-datasets-preview": "study_datasets",
    });

    applyContributorSchemaHelp(contributorSchema);
    applyStudyGroupSchemaHelp(studySchema);
    applyTabularSchemaHelp(participantsSchema, "participantHelp");
    applyTabularSchemaHelp(characteristicsSchema, "characteristicHelp");
    applyDeviceSchemaHelp(deviceSchema);
    applyDatasheetSchemaHelp(datasheetSchema);
    applyDatasetSchemaHelp(datasetSchema);
  } catch (error) {
    console.warn("Schema help could not be loaded.", error);
  }
}

function applySchemaHelp(schema, fieldMap) {
  Object.entries(fieldMap).forEach(([elementId, schemaField]) => {
    const element = document.querySelector(`#${elementId}`);
    const target = element?.closest("label");
    const property = schema?.properties?.[schemaField];
    if (!target || !property) {
      return;
    }
    target.title = `${property.description || schemaField}. Type: ${formatSchemaType(property)}.`;
    addHelpMarker(target, target.title);
  });
}

function applyContributorSchemaHelp(schema) {
  const institution = schema?.properties?.contributor_institution?.properties || {};
  const contributorHelp = {
    fullName: schema?.properties?.contributor_full_name,
    roles: schema?.properties?.contributor_roles,
    email: schema?.properties?.contributor_email,
    orcid: schema?.properties?.contributor_orcid,
    institutionName: institution.contributor_institution_name,
    institutionCity: institution.contributor_institution_city,
    institutionCountry: institution.contributor_institution_country,
  };
  state.contributorHelp = contributorHelp;
  renderContributors();
}

function applyStudyGroupSchemaHelp(schema) {
  const properties = schema?.properties?.study_groups?.items?.properties || {};
  state.studyGroupHelp = properties;
  renderStudyGroups();
}

function applyTabularSchemaHelp(schema, stateKey) {
  state[stateKey] = (schema.fields || []).reduce((fieldsByName, field) => {
    fieldsByName[field.name] = field;
    return fieldsByName;
  }, {});
  renderParticipants();
  renderCharacteristics();
}

function applyDeviceSchemaHelp(schema) {
  state.deviceHelp = schema?.properties || {};
  state.deviceSensorHelp = schema?.properties?.device_sensors?.items?.properties || {};
  renderDevices();
}

function applyDatasheetSchemaHelp(schema) {
  state.datasheetHelp = schema?.properties || {};
  state.datasheetSpectralHelp = schema?.properties?.datasheet_calibration_spectral_sensitivity?.items?.properties || {};
  state.datasheetChannelHelp = schema?.properties?.datasheet_channel?.items?.properties || {};
  renderDatasheets();
}

function applyDatasetSchemaHelp(schema) {
  const properties = schema?.properties || {};
  const crossref = properties.dataset_crossref?.properties || {};
  const datasetFile = properties.dataset_file?.items?.properties || {};
  const preprocessing = datasetFile.dataset_file_preprocessing?.properties || {};
  const datetime = datasetFile.dataset_file_datetime?.properties || properties.dataset_datetime?.properties || {};
  applySchemaHelp(schema, {
    "dataset-id": "dataset_internal_id",
    "dataset-timezone": "dataset_timezone",
  });

  const locationItemType = properties.dataset_location?.items
    ? formatSchemaType(properties.dataset_location.items)
    : "string";
  const fieldHelp = {
    studyId: schemaHelpTitle(crossref.dataset_crossref_study_id, "Internal ID for study"),
    participantId: schemaHelpTitle(crossref.dataset_crossref_participant_id, "Internal ID for participant"),
    deviceId: schemaHelpTitle(datasetFile.dataset_file_crossref_device_id || crossref.dataset_crossref_device_id, "Internal ID for device"),
    deviceLocation: schemaHelpTitle(datasetFile.dataset_file_device_location || properties.dataset_device_location, "Device location for this file group"),
    deviceLocationType: schemaHelpTitle(datasetFile.dataset_file_device_location_type, "Controlled device location category for this file group"),
    description: schemaHelpTitle(datasetFile.dataset_file_description, "Description of this file group"),
    temporalResolution: schemaHelpTitle(datasetFile.dataset_file_temporal_resolution || properties.dataset_sampling_interval, "Temporal resolution for this file group"),
    instructions: schemaHelpTitle(datasetFile.dataset_file_instructions || properties.dataset_instructions, "Collection instructions for this file group"),
    latitude: `Latitude of data collection. Type: ${locationItemType}.`,
    longitude: `Longitude of data collection. Type: ${locationItemType}.`,
  };

  const fileGroupHelp = [
    [fields.fileFormat, schemaHelpTitle(datasetFile.dataset_file_format, "File format")],
    [fields.encoding, schemaHelpTitle(datasetFile.dataset_file_encoding, "File text encoding")],
    [fields.headerRow, schemaHelpTitle(datasetFile.dataset_file_header_row, "Optional header row")],
    [fields.fileTimezone, schemaHelpTitle(datasetFile.dataset_file_timezone, "Timezone of data")],
    [fields.auxiliary, schemaHelpTitle(datasetFile.dataset_file_auxiliary, "Indicator whether this is an auxiliary file")],
    [fields.fileRole, schemaHelpTitle(datasetFile.dataset_file_role, "Role of this file group in the dataset")],
    [fields.fileModality, schemaHelpTitle(datasetFile.dataset_file_modality, "Controlled modalities contained in this file group")],
    [fields.fileModalityOther, schemaHelpTitle(datasetFile.dataset_file_modality_other, "Description of an other modality")],
    [fields.fileModalityOtherType, schemaHelpTitle(datasetFile.dataset_file_modality_other_type, "Whether an other modality is sensor or non-device")],
    [fields.dataState, schemaHelpTitle(datasetFile.dataset_file_data_state, "State of the data in this file group")],
    [fields.preprocessingBol, schemaHelpTitle(preprocessing.dataset_file_preprocessing_bol, "Indicator whether preprocessing was applied")],
    [fields.preprocessingDesc, schemaHelpTitle(preprocessing.dataset_file_preprocessing_desc, "Description of preprocessing")],
    [fields.datetimeDate, schemaHelpTitle(datetime.dataset_file_datetime_date || datetime.dataset_datetime_date, "Name of the date or datetime column")],
    [fields.datetimeDateformat, schemaHelpTitle(datetime.dataset_file_datetime_dateformat || datetime.dataset_datetime_dateformat, "Formatting of the date or datetime column")],
    [fields.datetimeTime, schemaHelpTitle(datetime.dataset_file_datetime_time || datetime.dataset_datetime_time, "Name of the separate time column")],
    [fields.datetimeTimeformat, schemaHelpTitle(datetime.dataset_file_datetime_timeformat || datetime.dataset_datetime_timeformat, "Formatting of the separate time column")],
  ];

  const localHelp = [
    [fields.datetimeSource, "Choose whether this file group has date/time columns or only a known collection date/time."],
    [fields.collectionDatetime, "Collection date/time value to use when the file has no date/time column."],
  ];

  [
    [fields.studyId, fieldHelp.studyId],
    [fields.participantId, fieldHelp.participantId],
    [fields.deviceId, fieldHelp.deviceId],
    [fields.deviceLocation, fieldHelp.deviceLocation],
    [fields.deviceLocationType, fieldHelp.deviceLocationType],
    [fields.temporalResolutionType, fieldHelp.temporalResolution],
    [fields.samplingInterval, fieldHelp.temporalResolution],
    [fields.temporalResolutionUnit, fieldHelp.temporalResolution],
    [fields.instructions, fieldHelp.instructions],
    [fields.fileDescription, fieldHelp.description],
    [fields.latitude, fieldHelp.latitude],
    [fields.longitude, fieldHelp.longitude],
    ...fileGroupHelp,
    ...localHelp,
  ].forEach(([element, helpText]) => {
    const label = element?.closest("label");
    if (!label) return;
    label.title = helpText;
    addHelpMarker(label, helpText);
  });
}

function schemaHelpTitle(property, fallback) {
  if (!property) {
    return fallback;
  }
  return `${property.description || fallback}. Type: ${formatSchemaType(property)}.`;
}

function helpMarker(helpText) {
  const text = escapeHtml(helpText);
  return `<span class="help-marker" title="${text}" data-help-text="${text}" role="button" tabindex="0" aria-label="${text}">?</span>`;
}

function addHelpMarker(label, helpText) {
  if (!label || label.querySelector(".help-marker")) {
    return;
  }
  const firstControl = label.querySelector("input, textarea, select");
  if (firstControl) {
    firstControl.insertAdjacentHTML("beforebegin", ` ${helpMarker(helpText)}`);
    return;
  }
  label.insertAdjacentHTML("beforeend", ` ${helpMarker(helpText)}`);
}

function formatSchemaType(property) {
  if (Array.isArray(property.type)) {
    return property.type.join(" or ");
  }
  if (property.type) {
    return property.type;
  }
  if (property.oneOf) {
    return property.oneOf.map((entry) => entry.type).filter(Boolean).join(" or ");
  }
  return "unspecified";
}

async function handleStudyImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    const study = Array.isArray(parsed) ? parsed[0] : parsed;
    assertResourceObject(study, [
      "study_internal_id",
      "study_title",
      "study_short_description",
      "study_sample",
      "study_groups",
      "study_contributors",
      "study_datasets",
    ], "study.json");
    populateStudyFromSchema(study);

    renderStudyGroups();
    renderContributors();
    updateCrossrefOptions();
    updatePreview();
    showImportFile(studyImportFile, file.name);
    studyImportSummary.textContent = `Imported ${file.name}. Datasets remain generated from the Datasets page.`;
    studyImportSummary.className = "import-summary ok";
  } catch (error) {
    hideImportFile(studyImportFile);
    studyImportSummary.textContent = `Could not import ${file.name}: ${error.message}`;
    studyImportSummary.className = "import-summary warning";
  } finally {
    studyImport.value = "";
  }
}

function populateStudyFromSchema(study) {
  if (!study || typeof study !== "object") {
    throw new Error("Expected a study object or an array containing one study object.");
  }

  fields.schemaVersion.value = normalizeBuilderSchemaVersion(
    study.schema_version || fields.schemaVersion.value || "3.0.2",
  );
  fields.studyInternalId.value = study.study_internal_id || "";
  fields.studyTitle.value = study.study_title || "";
  fields.studyPreregistration.value = study.study_preregistration || "";
  fields.studyRegistration.value = study.study_registration || "";
  fields.studyEthics.value = study.study_ethics || "";
  fields.studyType.value = study.study_type || "";
  fields.studyShortDescription.value = study.study_short_description || "";
  fields.studySample.value = study.study_sample || "";
  fields.studySetting.value = study.study_setting || "";
  fields.studyGeographicalLocation.value = study.study_geographical_location || "";
  fields.studyIntervention.value = study.study_intervention || "";
  fields.studyFundingSources.value = (study.study_funding_sources || []).join(", ");
  fields.studyKeywords.value = (study.study_keywords || []).join(", ");

  state.studyGroups = Array.isArray(study.study_groups)
    ? study.study_groups.map((group) => ({
        name: group.study_group_name || "",
        description: group.study_group_description || "",
        size: group.study_group_size ?? "",
        inclusion: (group.study_group_inclusion || []).join("; "),
        exclusion: (group.study_group_exclusion || []).join("; "),
        datasets: normalizeStringArray(group.study_group_datasets),
      }))
    : [];
  state.contributors = Array.isArray(study.study_contributors)
    ? study.study_contributors.map(contributorFromSchema)
    : [];
}

async function handleContributorsImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    state.contributors = isJsonFile(file)
      ? contributorsFromJson(text)
      : contributorsFromTable(text);

    renderContributors();
    updatePreview();
    showImportFile(contributorsImportFile, file.name);
    contributorsImportSummary.textContent = `Imported ${state.contributors.length} contributor row(s) from ${file.name}.`;
    contributorsImportSummary.className = "import-summary ok";
  } catch (error) {
    hideImportFile(contributorsImportFile);
    contributorsImportSummary.textContent = `Could not import ${file.name}: ${error.message}`;
    contributorsImportSummary.className = "import-summary warning";
  } finally {
    contributorsImport.value = "";
  }
}

function clearContributorsImport() {
  clearAllContributors("Contributor import removed. Add rows manually or import another contributor file.");
}

function clearAllContributors(message = "All contributor rows cleared. Add rows manually or import another contributor file.") {
  message = normalizeStatusMessage(message, "All contributor rows cleared. Add rows manually or import another contributor file.");
  state.contributors = [];
  contributorsImport.value = "";
  hideImportFile(contributorsImportFile);
  contributorsImportSummary.textContent = message;
  contributorsImportSummary.className = "import-summary";
  renderContributors();
  updatePreview();
}

function showImportFile(element, fileName) {
  element.hidden = false;
  element.textContent = `Imported file: ${fileName}`;
}

function showSelectedFile(element, fileName) {
  element.hidden = false;
  element.textContent = `Selected file: ${fileName}`;
}

function showSelectedFiles(element, fileNames) {
  element.hidden = false;
  element.textContent = `Selected files: ${fileNames.join(", ")}`;
}

function hideImportFile(element) {
  element.hidden = true;
  element.textContent = "";
}

function handleMetadataFileSelection(input, fileLabel, summary, resourceLabel, buttonLabel) {
  const file = input.files?.[0];
  if (!file) {
    hideImportFile(fileLabel);
    summary.textContent = `Choose a ${resourceLabel} first, then click Import.`;
    summary.className = "import-summary";
    return;
  }
  showSelectedFile(fileLabel, file.name);
  summary.textContent = `File selected. Click ${buttonLabel} to load it.`;
  summary.className = "import-summary";
}

function handleMetadataFilesSelection(input, fileLabel, summary, resourceLabel, buttonLabel) {
  const files = Array.from(input.files || []);
  if (files.length === 0) {
    hideImportFile(fileLabel);
    summary.textContent = `Choose ${resourceLabel} first, then click Import.`;
    summary.className = "import-summary";
    return;
  }
  showSelectedFiles(fileLabel, files.map((file) => file.name));
  summary.textContent = `${files.length} file(s) selected. Click ${buttonLabel} to load them.`;
  summary.className = "import-summary";
}

function isJsonFile(file) {
  return file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
}

function hasAnyKey(object, keys) {
  return Boolean(object && typeof object === "object" && keys.some((key) => Object.prototype.hasOwnProperty.call(object, key)));
}

function assertResourceObject(object, keys, resourceName) {
  if (!hasAnyKey(object, keys)) {
    throw new Error(`The selected file is not valid ${resourceName}. Please choose the correct metadata file.`);
  }
}

function assertResourceRows(rows, keys, resourceName) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No ${resourceName} rows were found in the uploaded file.`);
  }
  if (!rows.some((row) => hasAnyKey(row, keys))) {
    throw new Error(`The selected file is not valid ${resourceName}. Please choose the correct metadata file.`);
  }
}

const RESOURCE_KEYS = {
  contributors: [
    "contributor_full_name",
    "full_name",
    "name",
    "contributor_roles",
    "roles",
    "contributor_email",
    "email",
    "contributor_orcid",
    "orcid",
    "contributor_institution",
    "institution_name",
  ],
  participants: [
    "participant_internal_id",
    "participant_id",
    "id",
    "participant_age",
    "age",
    "participant_sex",
    "sex",
    "participant_gender",
    "gender",
  ],
  characteristics: [
    "participant_internal_id",
    "participant_id",
    "participant_characteristic_name",
    "name",
    "participant_characteristic_value",
    "value",
    "participant_characteristic_unit",
    "unit",
    "participant_characteristic_description",
    "description",
  ],
  devices: [
    "device_internal_id",
    "device_id",
    "device_manufacturer",
    "manufacturer",
    "device_model",
    "model",
    "device_serial_number",
    "serial_number",
    "device_calibration_date",
    "calibration_date",
    "device_firmware_version",
    "firmware_version",
    "device_datasheet_id",
    "datasheet_id",
    "device_sensors",
    "sensors",
  ],
  datasheets: [
    "datasheet_id",
    "id",
    "datasheet_version",
    "version",
    "datasheet_manufacturer",
    "manufacturer",
    "datasheet_type",
    "type",
    "datasheet_model",
    "model",
    "datasheet_calibration_interval",
    "calibration_interval",
    "datasheet_calibration_spectral_sensitivity",
    "spectral_sensitivity",
    "datasheet_channel",
    "channels",
  ],
  datasets: [
    "dataset_internal_id",
    "dataset_crossref",
    "dataset_device_location",
    "dataset_sampling_interval",
    "dataset_datetime",
    "dataset_timezone",
    "dataset_location",
    "dataset_file",
  ],
};

function contributorsFromJson(text) {
  const parsed = JSON.parse(text);
  const contributors = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.study_contributors)
      ? parsed.study_contributors
      : Array.isArray(parsed?.contributors)
        ? parsed.contributors
        : null;

  if (!contributors) {
    throw new Error("Expected contributors.json as an array, or study.json with study_contributors.");
  }

  assertResourceRows(contributors, RESOURCE_KEYS.contributors, "contributors metadata");
  return contributors.map(contributorFromSchema);
}

function contributorsFromTable(text) {
  const rows = parseTableText(text);
  assertResourceRows(rows, RESOURCE_KEYS.contributors, "contributors metadata");
  return rows.map((row) => ({
    fullName: row.contributor_full_name || row.full_name || row.name || "",
    roles: row.contributor_roles || row.roles || "",
    email: row.contributor_email || row.email || "",
    orcid: row.contributor_orcid || row.orcid || "",
    institutionName: row.contributor_institution_name || row.institution_name || "",
    institutionCity: row.contributor_institution_city || row.institution_city || "",
    institutionCountry: row.contributor_institution_country || row.institution_country || "",
  }));
}

function contributorFromSchema(contributor) {
  const institution = contributor.contributor_institution || {};
  return {
    fullName: contributor.contributor_full_name || "",
    roles: normalizeContributorRoles(contributor.contributor_roles),
    email: contributor.contributor_email || "",
    orcid: contributor.contributor_orcid || "",
    institutionName: institution.contributor_institution_name || "",
    institutionCity: institution.contributor_institution_city || "",
    institutionCountry: institution.contributor_institution_country || "",
  };
}

function normalizeContributorRoles(roles) {
  if (Array.isArray(roles)) {
    return roles.join("; ");
  }
  return roles || "";
}

function renderStudyGroups() {
  studyGroupsList.innerHTML = "";
  const datasetIds = getDatasetIdOptions();
  state.studyGroups.forEach((group, index) => {
    group.datasets = normalizeStringArray(group.datasets);
    const row = document.createElement("div");
    row.className = "participant-card";
    const help = state.studyGroupHelp || {};
    const nameHelp = schemaHelpTitle(help.study_group_name, "Group name");
    const descriptionHelp = schemaHelpTitle(help.study_group_description, "Group description");
    const sizeHelp = schemaHelpTitle(help.study_group_size, "Sample size");
    const inclusionHelp = schemaHelpTitle(help.study_group_inclusion, "Inclusion criteria for sample group; separate multiple criteria with semicolons");
    const exclusionHelp = schemaHelpTitle(help.study_group_exclusion, "Exclusion criteria for sample group; separate multiple criteria with semicolons");
    const datasetsHelp = schemaHelpTitle(help.study_group_datasets, "Dataset internal IDs linked to this study group");
    const missingDatasetIds = group.datasets.filter((datasetId) => !datasetIds.includes(datasetId));
    const selectedDatasetCount = group.datasets.length;
    const datasetIdsAssignedToOtherGroups = new Set(
      state.studyGroups.flatMap((otherGroup, otherIndex) => (
        otherIndex === index ? [] : normalizeStringArray(otherGroup.datasets)
      )),
    );
    const availableDatasetIds = datasetIds.filter((datasetId) => (
      !group.datasets.includes(datasetId) && !datasetIdsAssignedToOtherGroups.has(datasetId)
    ));
    const datasetOptions = availableDatasetIds.map((datasetId) => `
      <option value="${escapeHtml(datasetId)}">${escapeHtml(datasetId)}</option>
    `).join("");
    const selectedDatasetList = group.datasets.length
      ? group.datasets.map((datasetId) => `
        <li class="${datasetIds.includes(datasetId) ? "" : "missing-selection"}">
          <span>${escapeHtml(datasetId)}${datasetIds.includes(datasetId) ? "" : " (not found)"}</span>
          <button type="button" class="remove-selected-dataset" data-remove-dataset-id="${escapeHtml(datasetId)}" aria-label="Remove ${escapeHtml(datasetId)}">X</button>
        </li>
      `).join("")
      : `<li class="empty-selection">No datasets selected for this study group yet.</li>`;
    const missingNote = missingDatasetIds.length ? `
      <p class="choice-note warning-note">
        Some selected dataset IDs are no longer present on the Datasets page.
      </p>
    ` : "";
    row.innerHTML = `
      <div class="record-card-heading">
        <h3>Study group ${index + 1}</h3>
        <button type="button" class="remove-row">Remove study group</button>
      </div>
      <div class="participant-fields">
        <label title="${escapeHtml(nameHelp)}">Group name <span class="required">*</span> ${helpMarker(nameHelp)}
          <input value="${escapeHtml(group.name)}" data-field="name" placeholder="control" title="${escapeHtml(nameHelp)}" />
        </label>
        <label title="${escapeHtml(descriptionHelp)}">Description ${helpMarker(descriptionHelp)}
          <input value="${escapeHtml(group.description)}" data-field="description" placeholder="Optional group description" title="${escapeHtml(descriptionHelp)}" />
        </label>
        <label title="${escapeHtml(sizeHelp)}">Size ${helpMarker(sizeHelp)}
          <input value="${escapeHtml(group.size)}" data-field="size" type="number" min="0" step="1" placeholder="25" title="${escapeHtml(sizeHelp)}" />
        </label>
        <label title="${escapeHtml(inclusionHelp)}">Inclusion criteria ${helpMarker(inclusionHelp)}
          <input value="${escapeHtml(group.inclusion)}" data-field="inclusion" placeholder="18+; healthy adults" title="${escapeHtml(inclusionHelp)}" />
        </label>
        <label class="wide" title="${escapeHtml(exclusionHelp)}">Exclusion criteria ${helpMarker(exclusionHelp)}
          <input value="${escapeHtml(group.exclusion)}" data-field="exclusion" placeholder="Shift work; eye disease" title="${escapeHtml(exclusionHelp)}" />
        </label>
        <fieldset class="wide linked-dataset-field" title="${escapeHtml(datasetsHelp)}">
          <legend>Select datasets for this group <span class="required">*</span> ${helpMarker(datasetsHelp)}</legend>
          <p class="choice-note">
            Choose only the dataset records that belong to this study group.
            <span data-selected-dataset-count>${selectedDatasetCount}</span> selected.
          </p>
          <label class="dataset-select-label">Add dataset
            <select data-add-dataset ${availableDatasetIds.length ? "" : "disabled"}>
              <option value="">${datasetIds.length ? (availableDatasetIds.length ? "Choose a dataset..." : "All datasets selected") : "Add dataset records on the Datasets page first"}</option>
              ${datasetOptions}
            </select>
          </label>
          <ul class="selected-dataset-list">
            ${selectedDatasetList}
          </ul>
          ${missingNote}
        </fieldset>
      </div>
    `;
    row.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        group[input.dataset.field] = input.value.trim();
        updatePreview();
      });
    });
    row.querySelector("[data-add-dataset]")?.addEventListener("change", (event) => {
      const datasetId = event.target.value;
      const assignedToAnotherGroup = state.studyGroups.some((otherGroup, otherIndex) => (
        otherIndex !== index && normalizeStringArray(otherGroup.datasets).includes(datasetId)
      ));
      if (!datasetId || group.datasets.includes(datasetId) || assignedToAnotherGroup) {
        event.target.value = "";
        return;
      }
      group.datasets = [...group.datasets, datasetId];
      renderStudyGroups();
      updatePreview();
    });
    row.querySelectorAll("[data-remove-dataset-id]").forEach((button) => {
      button.addEventListener("click", () => {
        group.datasets = group.datasets.filter((datasetId) => datasetId !== button.dataset.removeDatasetId);
        renderStudyGroups();
        updatePreview();
      });
    });
    row.querySelector("button").addEventListener("click", () => {
      state.studyGroups.splice(index, 1);
      renderStudyGroups();
      updatePreview();
    });
    studyGroupsList.appendChild(row);
  });
}

function addStudyGroup() {
  state.studyGroups.push(createStudyGroup());
  renderStudyGroups();
  updatePreview();
}

function getDatasetIdOptions() {
  return Array.from(new Set(state.datasets.map((dataset) => dataset.datasetId).filter(Boolean)));
}

let studyGroupDatasetOptionsSignature = "";

function refreshStudyGroupsForDatasetOptions() {
  const signature = getDatasetIdOptions().join("\u001f");
  if (signature === studyGroupDatasetOptionsSignature) {
    return;
  }
  studyGroupDatasetOptionsSignature = signature;
  renderStudyGroups();
}

function renderContributors() {
  contributorsList.innerHTML = "";
  const contributorRequired = new Set(state.entitySchemas.contributor?.required || []);
  const institutionRequired = new Set(
    state.entitySchemas.contributor?.properties?.contributor_institution?.required || []
  );
  state.contributors.forEach((contributor, index) => {
    const row = document.createElement("div");
    row.className = "contributor-card";
    const help = state.contributorHelp || {};
    const fullNameHelp = schemaHelpTitle(help.fullName, "Full name of the contributor");
    const rolesHelp = schemaHelpTitle(help.roles, "Contributor roles. Separate multiple roles with semicolons");
    const emailHelp = schemaHelpTitle(help.email, "Email address");
    const orcidHelp = schemaHelpTitle(help.orcid, "ORCID identifier");
    const institutionNameHelp = schemaHelpTitle(help.institutionName, "Institution name");
    const institutionCityHelp = schemaHelpTitle(help.institutionCity, "Institution city");
    const institutionCountryHelp = schemaHelpTitle(help.institutionCountry, "Institution country");
    const institutionStarted = hasAnyValue([
      contributor.institutionName,
      contributor.institutionCity,
      contributor.institutionCountry,
    ]);
    const orcidRequired = contributorRequired.has("contributor_orcid");
    const institutionNameRequired = institutionStarted && institutionRequired.has("contributor_institution_name");
    const institutionCountryRequired = institutionStarted && institutionRequired.has("contributor_institution_country");
    row.innerHTML = `
      <div class="record-card-heading">
        <h3>Contributor ${index + 1}</h3>
        <button type="button" class="remove-row">Remove contributor</button>
      </div>
      <div class="contributor-fields">
        <label title="${escapeHtml(fullNameHelp)}">Full name <span class="required">*</span> ${helpMarker(fullNameHelp)}
          <input value="${escapeHtml(contributor.fullName)}" data-field="fullName" placeholder="Jane Doe" title="${escapeHtml(fullNameHelp)}" />
        </label>
        <label title="${escapeHtml(rolesHelp)}">Roles ${helpMarker(rolesHelp)}
          <input value="${escapeHtml(contributor.roles)}" data-field="roles" placeholder="author; data collector" title="${escapeHtml(rolesHelp)}" />
        </label>
        <label title="${escapeHtml(emailHelp)}">Email ${helpMarker(emailHelp)}
          <input value="${escapeHtml(contributor.email)}" data-field="email" type="email" placeholder="jane@example.org" title="${escapeHtml(emailHelp)}" />
        </label>
        <label title="${escapeHtml(orcidHelp)}">ORCID ${orcidRequired ? '<span class="required">*</span>' : ""} ${helpMarker(orcidHelp)}
          <input value="${escapeHtml(contributor.orcid)}" data-field="orcid" placeholder="0000-0000-0000-0000" title="${escapeHtml(orcidHelp)}" ${orcidRequired ? "required" : ""} />
        </label>
        <label title="${escapeHtml(institutionNameHelp)}">Institution name ${institutionNameRequired ? '<span class="required">*</span>' : ""} ${helpMarker(institutionNameHelp)}
          <input value="${escapeHtml(contributor.institutionName)}" data-field="institutionName" placeholder="Example University" title="${escapeHtml(institutionNameHelp)}" />
        </label>
        <label title="${escapeHtml(institutionCityHelp)}">Institution city ${helpMarker(institutionCityHelp)}
          <input value="${escapeHtml(contributor.institutionCity)}" data-field="institutionCity" placeholder="Berlin" title="${escapeHtml(institutionCityHelp)}" />
        </label>
        <label title="${escapeHtml(institutionCountryHelp)}">Institution country ${institutionCountryRequired ? '<span class="required">*</span>' : ""} ${helpMarker(institutionCountryHelp)}
          <input value="${escapeHtml(contributor.institutionCountry)}" data-field="institutionCountry" placeholder="Germany" title="${escapeHtml(institutionCountryHelp)}" />
        </label>
      </div>
    `;
    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        contributor[input.dataset.field] = input.value.trim();
        updatePreview();
      });
      input.addEventListener("change", () => {
        contributor[input.dataset.field] = input.value.trim();
        if (input.dataset.field?.startsWith("institution")) {
          renderContributors();
        }
        updatePreview();
      });
    });
    row.querySelector("button").addEventListener("click", () => {
      state.contributors.splice(index, 1);
      renderContributors();
      updatePreview();
    });
    contributorsList.appendChild(row);
  });
}

function addContributor() {
  state.contributors.push(createContributor());
  renderContributors();
  updatePreview();
}

async function handleParticipantsImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    state.participants = isJsonFile(file)
      ? participantsFromJson(text)
      : participantsFromTable(text);

    renderParticipants();
    renderCharacteristics();
    updateCrossrefOptions();
    updatePreview();
    showImportFile(participantsImportFile, file.name);
    participantsImportSummary.textContent = `Imported ${state.participants.length} participant row(s) from ${file.name}.`;
    participantsImportSummary.className = "import-summary ok";
  } catch (error) {
    hideImportFile(participantsImportFile);
    participantsImportSummary.textContent = `Could not import ${file.name}: ${error.message}`;
    participantsImportSummary.className = "import-summary warning";
  } finally {
    participantsImport.value = "";
  }
}

async function handleCharacteristicsImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    state.characteristics = isJsonFile(file)
      ? characteristicsFromJson(text)
      : characteristicsFromTable(text);

    renderCharacteristics();
    updatePreview();
    showImportFile(characteristicsImportFile, file.name);
    characteristicsImportSummary.textContent = `Imported ${state.characteristics.length} characteristic row(s) from ${file.name}.`;
    characteristicsImportSummary.className = "import-summary ok";
  } catch (error) {
    hideImportFile(characteristicsImportFile);
    characteristicsImportSummary.textContent = `Could not import ${file.name}: ${error.message}`;
    characteristicsImportSummary.className = "import-summary warning";
  } finally {
    characteristicsImport.value = "";
  }
}

function participantsFromJson(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.participants)
      ? parsed.participants
      : null;

  if (!rows) {
    throw new Error("Expected participants.json as an array, or an object with a participants array.");
  }

  assertResourceRows(rows, RESOURCE_KEYS.participants, "participants metadata");
  return rows.map(participantFromSchema);
}

function participantsFromTable(text) {
  const rows = parseTableText(text);
  assertResourceRows(rows, RESOURCE_KEYS.participants, "participants metadata");
  return rows.map(participantFromSchema);
}

function participantFromSchema(row) {
  return {
    id: row.participant_internal_id || row.id || row.participant_id || "",
    age: row.participant_age ?? row.age ?? "",
    sex: row.participant_sex || row.sex || "",
    gender: row.participant_gender || row.gender || "",
  };
}

function characteristicsFromJson(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.participant_characteristics)
      ? parsed.participant_characteristics
      : Array.isArray(parsed?.characteristics)
        ? parsed.characteristics
        : null;

  if (!rows) {
    throw new Error("Expected participant characteristics as an array, or an object with participant_characteristics.");
  }

  assertCharacteristicRows(rows);
  return rows.map(characteristicFromSchema);
}

function characteristicsFromTable(text) {
  const rows = parseTableText(text);
  assertCharacteristicRows(rows);
  return rows.map(characteristicFromSchema);
}

function assertCharacteristicRows(rows) {
  assertResourceRows(rows, RESOURCE_KEYS.characteristics, "participant characteristics metadata");
  const nameKeys = ["participant_characteristic_name"];
  if (!rows.some((row) => nameKeys.some((key) => Object.prototype.hasOwnProperty.call(row || {}, key)
    && String(row[key] ?? "").trim()))) {
    throw new Error("The selected file contains participant rows but no participant_characteristic_name values. Choose participant_characteristics.csv or a corresponding characteristics JSON file.");
  }
}

function characteristicFromSchema(row) {
  return {
    participantId: row.participant_internal_id || row.participant_id || "",
    name: row.participant_characteristic_name || row.name || "",
    value: row.participant_characteristic_value || row.value || "",
    unit: row.participant_characteristic_unit || row.unit || "",
    description: row.participant_characteristic_description || row.description || "",
  };
}

function clearParticipantsPage() {
  clearAllParticipants("Participants page cleared. Add rows manually or import participant files.");
  clearAllCharacteristics("Participant characteristics cleared. Add rows manually or import a characteristics file.");
}

function clearAllParticipants(message = "All participant rows cleared. Add rows manually or import another file.") {
  message = normalizeStatusMessage(message, "All participant rows cleared. Add rows manually or import another file.");
  state.participants = [];
  participantsImport.value = "";
  hideImportFile(participantsImportFile);
  participantsImportSummary.textContent = message;
  participantsImportSummary.className = "import-summary";
  renderParticipants();
  renderCharacteristics();
  updateCrossrefOptions();
  updatePreview();
}

function clearAllCharacteristics(message = "All characteristic rows cleared. Add rows manually or import another file.") {
  message = normalizeStatusMessage(message, "All characteristic rows cleared. Add rows manually or import another file.");
  state.characteristics = [];
  characteristicsImport.value = "";
  hideImportFile(characteristicsImportFile);
  characteristicsImportSummary.textContent = message;
  characteristicsImportSummary.className = "import-summary";
  renderCharacteristics();
  updatePreview();
}

async function handleDevicesImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  await importDevicesFile(file);
}

async function importDevicesFile(file) {
  devicesImportSummary.textContent = `Reading ${file.name}...`;
  devicesImportSummary.className = "import-summary";

  try {
    const text = await file.text();
    const importedDevices = isJsonFile(file)
      ? devicesFromJson(text)
      : devicesFromTable(text);

    if (importedDevices.length === 0) {
      throw new Error("No device rows were found in the uploaded file.");
    }

    state.devices = importedDevices;
    renderDevices();
    updateCrossrefOptions();
    updatePreview();
    showImportFile(devicesImportFile, file.name);
    devicesImportSummary.textContent = `Imported ${state.devices.length} device row(s) from ${file.name}. Datasheet IDs can be finalized in the datasheet section below.`;
    devicesImportSummary.className = "import-summary ok";
  } catch (error) {
    hideImportFile(devicesImportFile);
    devicesImportSummary.textContent = `Could not import ${file.name}: ${error.message}`;
    devicesImportSummary.className = "import-summary warning";
  } finally {
    devicesImport.value = "";
  }
}

function devicesFromJson(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.devices)
      ? parsed.devices
      : parsed?.device_internal_id || parsed?.device_id || parsed?.id
        ? [parsed]
        : null;

  if (!rows) {
    throw new Error("Expected devices.json as an array, a single device object, or an object with a devices array.");
  }

  assertResourceRows(rows, RESOURCE_KEYS.devices, "devices metadata");
  return rows.map(deviceFromSchema);
}

function devicesFromTable(text) {
  const rows = parseTableText(text);
  assertResourceRows(rows, RESOURCE_KEYS.devices, "devices metadata");
  return rows.map(deviceFromSchema);
}

function deviceFromSchema(row) {
  return {
    id: row.device_internal_id || row.id || row.device_id || "",
    manufacturer: row.device_manufacturer || row.manufacturer || "",
    model: row.device_model || row.model || "",
    serialNumber: row.device_serial_number || row.serial_number || "",
    calibrationDate: row.device_calibration_date || row.calibration_date || "",
    firmwareVersion: row.device_firmware_version || row.firmware_version || "",
    datasheetId: row.device_datasheet_id || row.datasheet_id || "",
    sensorsText: sensorsToText(row.device_sensors || row.sensors || ""),
  };
}

function sensorsToText(sensors) {
  if (Array.isArray(sensors)) {
    return sensors
      .map((sensor) => {
        if (typeof sensor === "string") {
          return sensor.trim();
        }
        const type = sensor?.device_sensor_type || sensor?.sensor_type || "";
        const datasheetId = sensor?.device_sensor_datasheet_id || sensor?.sensor_datasheet_id || "";
        return [type, datasheetId].filter(Boolean).join(" | ");
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(sensors || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("\n");
}

function clearDevicesPage() {
  clearAllDevices("Devices page cleared. Add rows manually or import a devices file.");
}

function clearAllDevices(message = "All device rows cleared. Add rows manually or import another file.") {
  message = normalizeStatusMessage(message, "All device rows cleared. Add rows manually or import another file.");
  state.devices = [];
  devicesImport.value = "";
  hideImportFile(devicesImportFile);
  devicesImportSummary.textContent = message;
  devicesImportSummary.className = "import-summary";
  renderDevices();
  updateCrossrefOptions();
  updatePreview();
}

async function handleDatasheetsImport(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }
  await importDatasheetsFiles(files);
}

async function importDatasheetsFiles(files) {
  datasheetsImportSummary.textContent = `Reading ${files.length} datasheet file(s)...`;
  datasheetsImportSummary.className = "import-summary";

  try {
    const parsedRows = [];
    const parsedFileNames = [];
    for (const file of files) {
      const text = await file.text();
      const rows = isJsonFile(file)
        ? datasheetsFromJson(text)
        : datasheetsFromTable(text);
      parsedRows.push(...rows);
      parsedFileNames.push(file.name);
    }

    if (parsedRows.length === 0) {
      throw new Error("No datasheet rows were found in the uploaded file.");
    }

    const result = upsertDatasheets(parsedRows);
    parsedFileNames.forEach((fileName) => {
      if (!state.datasheetImportedFiles.includes(fileName)) {
        state.datasheetImportedFiles.push(fileName);
      }
    });
    renderDatasheets();
    renderDevices();
    updateCrossrefOptions();
    updatePreview();
    showImportedFiles(datasheetsImportFile, state.datasheetImportedFiles);
    datasheetsImportSummary.textContent = `Imported ${parsedRows.length} datasheet row(s): ${result.added} added, ${result.updated} updated. Types: ${summarizeDatasheetTypes(parsedRows)}.`;
    datasheetsImportSummary.className = "import-summary ok";
  } catch (error) {
    hideImportFile(datasheetsImportFile);
    datasheetsImportSummary.textContent = `Could not import datasheet file(s): ${error.message}`;
    datasheetsImportSummary.className = "import-summary warning";
  } finally {
    datasheetsImport.value = "";
  }
}

function upsertDatasheets(rows) {
  let added = 0;
  let updated = 0;
  const hasExistingContent = state.datasheets.some((entry) => entry.id || entry.manufacturer || entry.model || entry.type);

  if (!hasExistingContent) {
    state.datasheets = [];
  }

  rows.forEach((row) => {
    const existingIndex = row.id
      ? state.datasheets.findIndex((entry) => entry.id === row.id)
      : -1;

    if (existingIndex >= 0) {
      state.datasheets[existingIndex] = row;
      updated += 1;
    } else {
      state.datasheets.push(row);
      added += 1;
    }
  });

  return { added, updated };
}

function showImportedFiles(element, fileNames) {
  element.hidden = false;
  element.textContent = `Imported files: ${fileNames.join(", ")}`;
}

function summarizeDatasheetTypes(rows) {
  const types = Array.from(new Set(rows.map((row) => row.type).filter(Boolean)));
  return types.length ? types.join(", ") : "not specified";
}

function datasheetsFromJson(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.datasheets)
      ? parsed.datasheets
      : parsed?.datasheet_id || parsed?.id
        ? [parsed]
        : null;

  if (!rows) {
    throw new Error("Expected a datasheet array, a single datasheet object, or an object with a datasheets array.");
  }

  assertResourceRows(rows, RESOURCE_KEYS.datasheets, "datasheet metadata");
  return rows.map(datasheetFromSchema);
}

function datasheetsFromTable(text) {
  const rows = parseTableText(text);
  assertResourceRows(rows, RESOURCE_KEYS.datasheets, "datasheet metadata");
  return rows.map(datasheetFromSchema);
}

function datasheetFromSchema(row) {
  const rawModalities = row.datasheet_sensor_modality ?? row.sensor_modality ?? [];
  return {
    id: row.datasheet_id || row.id || "",
    version: row.datasheet_version || row.version || "",
    manufacturer: row.datasheet_manufacturer || row.manufacturer || "",
    type: row.datasheet_type || row.type || "",
    modalities: Array.isArray(rawModalities) ? rawModalities : rawModalities ? [rawModalities] : [],
    modalityOther: row.datasheet_sensor_modality_other || "",
    model: row.datasheet_model || row.model || "",
    calibrationInterval: row.datasheet_calibration_interval ?? row.calibration_interval ?? "",
    calibrationMethod: row.datasheet_calibration_method || "",
    calibrationAccuracy: row.datasheet_calibration_accuracy || "",
    calibrationNotes: row.datasheet_calibration_notes || "",
    calibrationParametersText: calibrationParametersToText(row.datasheet_calibration_parameters),
    spectralSensitivityText: spectralSensitivityToText(row.datasheet_calibration_spectral_sensitivity || row.spectral_sensitivity || ""),
    linearity: row.datasheet_calibration_linearity || row.linearity || "",
    directionalResponse: row.datasheet_calibration_directional_response || row.directional_response || "",
    range: row.datasheet_calibration_range || row.calibration_range || row.range || "",
    channelsText: channelsToText(row.datasheet_channel || row.channels || ""),
  };
}

function calibrationParametersToText(value) {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry) => [entry?.parameter_name, entry?.parameter_value, entry?.parameter_unit, entry?.parameter_description]
      .map((part) => part ?? "")
      .join(" | "))
    .filter(Boolean)
    .join("\n");
}

function parseCalibrationParameters(text) {
  const rows = String(text || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, rawValue, unit, description] = line.split("|").map((part) => part.trim());
      let value = rawValue;
      if (rawValue !== "" && Number.isFinite(Number(rawValue))) value = Number(rawValue);
      if (rawValue === "true") value = true;
      if (rawValue === "false") value = false;
      return {
        parameter_name: name,
        parameter_value: value,
        parameter_unit: unit || null,
        parameter_description: description || null,
      };
    });
  return rows.length ? rows : null;
}

function spectralSensitivityToText(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const wavelength = entry?.datasheet_calibration_spectral_sensitivity_wavelength ?? entry?.wavelength ?? "";
        const relative = entry?.datasheet_calibration_spectral_sensitivity_relative ?? entry?.relative ?? "";
        return wavelength !== "" || relative !== "" ? `${wavelength},${relative}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(value || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("\n");
}

function channelsToText(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        const nr = entry?.datasheet_channel_nr ?? entry?.channel_nr ?? "";
        const name = entry?.datasheet_channel_name || entry?.channel_name || "";
        const unit = entry?.datasheet_channel_unit || entry?.channel_unit || "";
        const description = entry?.datasheet_channel_description || entry?.channel_description || "";
        return [nr, name, unit, description].filter((part) => part !== "").join(" | ");
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(value || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("\n");
}

function clearDatasheetsPage() {
  clearAllDatasheets("Datasheets section cleared. Add rows manually or import a datasheet file.");
}

function clearAllDatasheets(message = "All datasheet rows cleared. Add rows manually or import another file.") {
  message = normalizeStatusMessage(message, "All datasheet rows cleared. Add rows manually or import another file.");
  state.datasheets = [];
  state.datasheetImportedFiles = [];
  datasheetsImport.value = "";
  hideImportFile(datasheetsImportFile);
  datasheetsImportSummary.textContent = message;
  datasheetsImportSummary.className = "import-summary";
  renderDatasheets();
  renderDevices();
  updateCrossrefOptions();
  updatePreview();
}

async function handleDatasetImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  await importDatasetFile(file);
}

async function importDatasetFile(file) {
  datasetImportSummary.textContent = `Reading ${file.name}...`;
  datasetImportSummary.className = "import-summary";

  try {
    const rows = datasetRowsFromJson(await file.text());

    fields.schemaVersion.value = normalizeBuilderSchemaVersion(
      rows.find((row) => row?.schema_version)?.schema_version || fields.schemaVersion.value || "3.0.2",
    );
    loadSchemaHelp(fields.schemaVersion.value);
    state.datasets = rows.map(datasetRecordFromSchema);
    state.activeDatasetIndex = 0;
    state.activeGroupIndex = 0;
    syncControlsFromActiveDataset();
    showImportFile(datasetImportFile, file.name);
    datasetImportSummary.textContent = `Imported ${rows.length} dataset record(s) from ${file.name}.`;
    datasetImportSummary.className = "import-summary ok";
  } catch (error) {
    hideImportFile(datasetImportFile);
    datasetImportSummary.textContent = `Could not import ${file.name}: ${error.message}`;
    datasetImportSummary.className = "import-summary warning";
  } finally {
    datasetImport.value = "";
  }
}

function datasetRowsFromJson(text) {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.datasets)
      ? parsed.datasets
      : parsed?.dataset_internal_id
        ? [parsed]
        : null;

  if (!rows || rows.length === 0) {
    throw new Error("Expected datasets.json as an array, a single dataset object, or an object with a datasets array.");
  }

  assertResourceRows(rows, RESOURCE_KEYS.datasets, "datasets metadata");
  return rows;
}

function populateDatasetFromSchema(dataset) {
  state.datasets = [datasetRecordFromSchema(dataset)];
  state.activeDatasetIndex = 0;
  state.activeGroupIndex = 0;
  fields.schemaVersion.value = normalizeBuilderSchemaVersion(
    dataset.schema_version || fields.schemaVersion.value || "3.0.2",
  );
  loadSchemaHelp(fields.schemaVersion.value);
  syncControlsFromActiveDataset();
  updatePreview();
}

function datasetRecordFromSchema(dataset) {
  const record = createDatasetRecord();
  record.datasetId = dataset.dataset_internal_id || "";
  record.studyId = dataset.dataset_crossref?.dataset_crossref_study_id || "";
  record.participantAssociated = typeof dataset.dataset_participant_associated === "boolean"
    ? dataset.dataset_participant_associated
    : Boolean(dataset.dataset_crossref?.dataset_crossref_participant_id);
  record.participantId = dataset.dataset_crossref?.dataset_crossref_participant_id || "";
  record.instructions = dataset.dataset_instructions || "";
  record.deviceId = dataset.dataset_crossref?.dataset_crossref_device_id || "";
  record.deviceLocation = dataset.dataset_device_location || "";
  record.samplingInterval = dataset.dataset_sampling_interval ?? "";
  record.datasetTimezone = dataset.dataset_timezone || "";
  record.latitude = Array.isArray(dataset.dataset_location) ? dataset.dataset_location[0] || "" : "";
  record.longitude = Array.isArray(dataset.dataset_location) ? dataset.dataset_location[1] || "" : "";

  const terms = normalizeDatasetTerms(dataset.dataset_variable_terms);
  const datasetFiles = Array.isArray(dataset.dataset_file) && dataset.dataset_file.length
    ? dataset.dataset_file
    : [];

  record.fileGroups = datasetFiles.length
    ? datasetFiles.map((fileGroup, index) => fileGroupFromSchema(fileGroup, terms, `File group ${index + 1}`))
    : [createFileGroup()];

  if (!String(dataset.schema_version || "2.0.0").startsWith("3.")) {
    const legacyGroup = record.fileGroups.find((group) => !group.auxiliary) || record.fileGroups[0];
    legacyGroup.deviceId = record.deviceId;
    legacyGroup.deviceLocation = record.deviceLocation;
    legacyGroup.samplingInterval = record.samplingInterval;
    legacyGroup.instructions = record.instructions;
  }

  const datasetDatetime = dataset.dataset_datetime;
  if (datasetDatetime && typeof datasetDatetime === "object") {
    const datetimeTarget = record.fileGroups.find((group) => !group.auxiliary) || record.fileGroups[0];
    datetimeTarget.datetimeSource = "column";
    datetimeTarget.datetimeDate = datasetDatetime.dataset_datetime_date || "";
    datetimeTarget.datetimeDateformat = datasetDatetime.dataset_datetime_dateformat || "";
    datetimeTarget.datetimeTime = datasetDatetime.dataset_datetime_time || "";
    datetimeTarget.datetimeTimeformat = datasetDatetime.dataset_datetime_timeformat || "";
  }

  return record;
}

function normalizeDatasetTerms(terms) {
  const normalized = Array.isArray(terms)
    ? terms
      .map((entry) => ({
        term: entry?.term || "",
        label: entry?.label || "",
      }))
      .filter((entry) => entry.term)
    : [];
  if (!normalized.some((entry) => entry.term === "other")) {
    normalized.push({ term: "other", label: "Other" });
  }
  return normalized;
}

function fileGroupFromSchema(fileGroup, datasetTerms, fallbackName) {
  const group = createFileGroup(fallbackName);
  group.modalities = Array.isArray(fileGroup.dataset_file_modality) ? fileGroup.dataset_file_modality : [];
  group.modalityOther = fileGroup.dataset_file_modality_other || "";
  group.modalityOtherType = fileGroup.dataset_file_modality_other_type || "";
  const instrument = fileGroup.dataset_file_instrument || {};
  group.instrumentType = instrument.instrument_type || "";
  group.instrumentName = instrument.instrument_name || "";
  group.collectionMethod = instrument.collection_method || "";
  group.softwareName = instrument.software_name || "";
  group.collectionMethodOther = instrument.collection_method_other || "";
  group.recordedBy = instrument.recorded_by || "";
  group.recordedByOther = instrument.recorded_by_other || "";
  group.description = fileGroup.dataset_file_description || "";
  group.deviceId = fileGroup.dataset_file_crossref_device_id || "";
  group.deviceLocation = fileGroup.dataset_file_device_location || "";
  group.deviceLocationType = fileGroup.dataset_file_device_location_type || "";
  const temporalResolution = fileGroup.dataset_file_temporal_resolution;
  group.temporalResolutionType = temporalResolution?.resolution_type || "fixed_interval";
  group.samplingInterval = temporalResolution?.value ?? fileGroup.dataset_file_sampling_interval ?? "";
  group.temporalResolutionUnit = temporalResolution?.unit || "";
  group.instructions = fileGroup.dataset_file_instructions || "";
  group.files = Array.isArray(fileGroup.dataset_file_names)
    ? fileGroup.dataset_file_names.map((name) => pathBasename(name))
    : [];
  group.columns = Array.isArray(fileGroup.dataset_file_variables)
    ? fileGroup.dataset_file_variables.map((variable) => variable.dataset_file_variables_name).filter(Boolean)
    : [];
  group.fileFormat = fileGroup.dataset_file_format || "";
  group.encoding = Array.isArray(fileGroup.dataset_file_encoding) ? fileGroup.dataset_file_encoding[0] || "" : "";
  group.fileTimezone = fileGroup.dataset_file_timezone || "";
  const fileDatetime = fileGroup.dataset_file_datetime;
  if (fileDatetime && typeof fileDatetime === "object") {
    GlcDatetimeMetadata.applyFileDatetimeToGroup(group, fileDatetime);
  }
  group.auxiliary = typeof fileGroup.dataset_file_auxiliary === "boolean" ? fileGroup.dataset_file_auxiliary : "";
  group.role = fileGroup.dataset_file_role || "";
  group.dataState = fileGroup.dataset_file_data_state || "";
  group.headerRow = fileGroup.dataset_file_header_row ?? "";
  group.preprocessingBol = typeof fileGroup.dataset_file_preprocessing?.dataset_file_preprocessing_bol === "boolean"
    ? fileGroup.dataset_file_preprocessing.dataset_file_preprocessing_bol
    : "";
  group.preprocessingDesc = Array.isArray(fileGroup.dataset_file_preprocessing?.dataset_file_preprocessing_desc)
    ? fileGroup.dataset_file_preprocessing.dataset_file_preprocessing_desc.join("\n")
    : "";
  group.terms = mergeTermsWithVariables(datasetTerms, fileGroup.dataset_file_variables);
  group.variableState = variableStateFromSchema(fileGroup.dataset_file_variables, fileGroup.primary_variables);
  group.name = group.role === "supporting" || group.auxiliary === true ? "Supporting file group" : "Primary file group";
  return group;
}

function mergeTermsWithVariables(datasetTerms, variables) {
  const terms = datasetTerms.map((entry) => ({ ...entry }));
  (variables || []).forEach((variable) => {
    const term = variable?.dataset_file_variables_term?.variable_term;
    if (term && !terms.some((entry) => entry.term === term)) {
      terms.push({ term, label: term === "other" ? "Other" : term });
    }
  });
  if (!terms.some((entry) => entry.term === "other")) {
    terms.push({ term: "other", label: "Other" });
  }
  return terms;
}

function variableStateFromSchema(variables, primaryVariables) {
  const primary = new Set(Array.isArray(primaryVariables) ? primaryVariables : []);
  return (variables || []).reduce((stateByColumn, variable) => {
    const column = variable.dataset_file_variables_name;
    if (!column) return stateByColumn;
    const term = variable.dataset_file_variables_term?.variable_term || "other";
    stateByColumn[column] = {
      primary: primary.has(column),
      label: variable.dataset_file_variables_labels || column,
      description: variable.dataset_file_variables_description || "",
      unit: variable.dataset_file_variables_units || "",
      calibration: variable.dataset_file_variables_calibration || "",
      type: variable.dataset_file_variables_type || "",
      factorLevelsText: formatFactorLevels(variable.dataset_file_variables_factor_levels),
      term,
      variableName: variable.dataset_file_variables_term?.variable_name || column,
    };
    return stateByColumn;
  }, {});
}

function pathBasename(path) {
  return String(path || "").split(/[\\/]/).pop();
}

function setPendingSelectValue(select, value) {
  if (!select) return;
  if (value && !Array.from(select.options).some((option) => option.value === value)) {
    select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
  }
  select.value = value || "";
}

function clearDatasetPage(message = "Dataset page cleared. Add data manually or import another datasets.json file.") {
  const next = createDatasetRecord();
  state.datasets = [next];
  state.activeDatasetIndex = 0;
  state.fileGroups = next.fileGroups;
  state.activeGroupIndex = 0;
  datasetImport.value = "";
  hideImportFile(datasetImportFile);
  datasetImportSummary.textContent = normalizeStatusMessage(message, "Dataset page cleared. Add data manually or import another datasets.json file.");
  datasetImportSummary.className = "import-summary";
  syncControlsFromActiveDataset();
  updateCrossrefOptions();
  updatePreview();
}

function normalizeStatusMessage(message, fallback) {
  return typeof message === "string" ? message : fallback;
}

function renderParticipants() {
  participantsList.innerHTML = "";
  const participantFields = new Map(
    (state.entitySchemas.participants?.fields || []).map((field) => [field.name, field])
  );
  state.participants.forEach((participant, index) => {
    const row = document.createElement("div");
    row.className = "participant-card";
    const help = state.participantHelp || {};
    const idHelp = schemaHelpTitle(help.participant_internal_id, "Unique ID for participant");
    const ageHelp = schemaHelpTitle(help.participant_age, "Age of the participant");
    const sexHelp = schemaHelpTitle(help.participant_sex, "Sex of participant");
    const genderHelp = schemaHelpTitle(help.participant_gender, "Gender of participant");
    const idRequired = participantFields.get("participant_internal_id")?.constraints?.required === true;
    const ageRequired = participantFields.get("participant_age")?.constraints?.required === true;
    row.innerHTML = `
      <div class="record-card-heading">
        <h3>Participant ${index + 1}</h3>
        <button type="button" class="remove-row" ${state.participants.length === 1 ? "disabled" : ""}>Remove participant</button>
      </div>
      <div class="participant-fields">
        <label title="${escapeHtml(idHelp)}">Participant ID ${idRequired ? '<span class="required">*</span>' : ""} ${helpMarker(idHelp)}
          <input value="${escapeHtml(participant.id)}" data-field="id" placeholder="P001" title="${escapeHtml(idHelp)}" />
        </label>
        <label title="${escapeHtml(ageHelp)}">Age ${ageRequired ? '<span class="required">*</span>' : ""} ${helpMarker(ageHelp)}
          <input value="${escapeHtml(participant.age)}" data-field="age" type="number" min="0" max="120" step="1" placeholder="35" title="${escapeHtml(ageHelp)}" />
        </label>
        <label title="${escapeHtml(sexHelp)}">Sex ${helpMarker(sexHelp)}
          <input value="${escapeHtml(participant.sex)}" data-field="sex" placeholder="female" title="${escapeHtml(sexHelp)}" />
        </label>
        <label title="${escapeHtml(genderHelp)}">Gender ${helpMarker(genderHelp)}
          <input value="${escapeHtml(participant.gender)}" data-field="gender" placeholder="woman" title="${escapeHtml(genderHelp)}" />
        </label>
      </div>
    `;
    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        participant[input.dataset.field] = input.value.trim();
        updateCrossrefOptions();
        renderCharacteristics();
        updatePreview();
      });
    });
    row.querySelector("button").addEventListener("click", () => {
      state.participants.splice(index, 1);
      renderParticipants();
      renderCharacteristics();
      updateCrossrefOptions();
      updatePreview();
    });
    participantsList.appendChild(row);
  });
}

function addParticipant() {
  state.participants.push(createParticipant());
  renderParticipants();
  updateCrossrefOptions();
  updatePreview();
}

function renderCharacteristics() {
  characteristicsList.innerHTML = "";
  const characteristicPrimaryKey = new Set(
    normalizeStringArray(state.entitySchemas.characteristics?.primaryKey)
  );
  state.characteristics.forEach((characteristic, index) => {
    const row = document.createElement("div");
    row.className = "participant-card";
    const help = state.characteristicHelp || {};
    const participantHelp = schemaHelpTitle(help.participant_internal_id, "Linked participant ID");
    const nameHelp = schemaHelpTitle(help.participant_characteristic_name, "Name of the participant characteristic");
    const valueHelp = schemaHelpTitle(help.participant_characteristic_value, "Value of the participant characteristic");
    const unitHelp = schemaHelpTitle(
      help.participant_characteristic_unit,
      "Optional unit of the characteristic value. Leave blank for unitless scores or categorical values."
    );
    const descriptionHelp = schemaHelpTitle(help.participant_characteristic_description, "Additional notes or description");
    row.innerHTML = `
      <div class="record-card-heading">
        <h3>Characteristic ${index + 1}</h3>
        <button type="button" class="remove-row">Remove characteristic</button>
      </div>
      <div class="participant-fields">
        <label title="${escapeHtml(participantHelp)}">Participant ${characteristicPrimaryKey.has("participant_internal_id") ? '<span class="required">*</span>' : ""} ${helpMarker(participantHelp)}
          <select class="participant-select" data-field="participantId" title="${escapeHtml(participantHelp)}"></select>
        </label>
        <label title="${escapeHtml(nameHelp)}">Name ${characteristicPrimaryKey.has("participant_characteristic_name") ? '<span class="required">*</span>' : ""} ${helpMarker(nameHelp)}
          <input value="${escapeHtml(characteristic.name)}" data-field="name" placeholder="chronotype" title="${escapeHtml(nameHelp)}" />
        </label>
        <label title="${escapeHtml(valueHelp)}">Value ${helpMarker(valueHelp)}
          <input value="${escapeHtml(characteristic.value)}" data-field="value" placeholder="intermediate" title="${escapeHtml(valueHelp)}" />
        </label>
        <label title="${escapeHtml(unitHelp)}">Unit ${helpMarker(unitHelp)}
          <input value="${escapeHtml(characteristic.unit)}" data-field="unit" placeholder="Optional" title="${escapeHtml(unitHelp)}" />
        </label>
        <label class="wide" title="${escapeHtml(descriptionHelp)}">Description ${helpMarker(descriptionHelp)}
          <input value="${escapeHtml(characteristic.description)}" data-field="description" placeholder="Optional notes" title="${escapeHtml(descriptionHelp)}" />
        </label>
      </div>
    `;
    const select = row.querySelector("select");
    setSelectOptions(select, getParticipantIds(), "Select participant");
    select.value = characteristic.participantId;
    row.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", () => {
        characteristic[input.dataset.field] = input.value.trim();
        updatePreview();
      });
      input.addEventListener("change", () => {
        characteristic[input.dataset.field] = input.value.trim();
        updatePreview();
      });
    });
    row.querySelector("button").addEventListener("click", () => {
      state.characteristics.splice(index, 1);
      renderCharacteristics();
      updatePreview();
    });
    characteristicsList.appendChild(row);
  });
}

function addCharacteristic() {
  state.characteristics.push(createCharacteristic());
  renderCharacteristics();
  updateCrossrefOptions();
  updatePreview();
}

function renderDevices() {
  devicesList.innerHTML = "";
  state.devices.forEach((device, index) => {
    const card = document.createElement("div");
    card.className = "participant-card";
    const help = state.deviceHelp || {};
    const sensorHelp = state.deviceSensorHelp || {};
    const idHelp = schemaHelpTitle(help.device_internal_id, "Unique internal identifier for the device");
    const manufacturerHelp = schemaHelpTitle(help.device_manufacturer, "Manufacturer of the device");
    const modelHelp = schemaHelpTitle(help.device_model, "Model name or number of the device");
    const serialNumberHelp = schemaHelpTitle(help.device_serial_number, "Serial number assigned to the individual device");
    const calibrationDateHelp = schemaHelpTitle(help.device_calibration_date, "Required date of the device's most recent applicable calibration (YYYY-MM-DD).");
    const firmwareHelp = schemaHelpTitle(help.device_firmware_version, "Firmware version installed on the device");
    const datasheetHelp = schemaHelpTitle(help.device_datasheet_id, "Reference to the general device datasheet. This can be completed in the datasheet section.");
    const sensorTypeHelp = schemaHelpTitle(sensorHelp.device_sensor_type, "Sensor type, e.g. photopic light sensor");
    const sensorDatasheetHelp = schemaHelpTitle(sensorHelp.device_sensor_datasheet_id, "Optional sensor-specific datasheet ID");
    const sensorsHelp = `${schemaHelpTitle(help.device_sensors, "List of sensors contained within the device")} Add one row per sensor.`;
    card.innerHTML = `
      <div class="record-card-heading">
        <h3>Device ${index + 1}</h3>
        <button type="button" class="remove-row">Remove device</button>
      </div>
      <div class="participant-fields">
        <label title="${escapeHtml(idHelp)}">Device ID <span class="required">*</span> ${helpMarker(idHelp)}
          <input data-field="id" value="${escapeHtml(device.id)}" placeholder="D001" title="${escapeHtml(idHelp)}" />
        </label>
        <label title="${escapeHtml(manufacturerHelp)}">Manufacturer <span class="required">*</span> ${helpMarker(manufacturerHelp)}
          <input data-field="manufacturer" value="${escapeHtml(device.manufacturer)}" placeholder="ActLumus" title="${escapeHtml(manufacturerHelp)}" />
        </label>
        <label title="${escapeHtml(modelHelp)}">Model <span class="required">*</span> ${helpMarker(modelHelp)}
          <input data-field="model" value="${escapeHtml(device.model)}" placeholder="Model name" title="${escapeHtml(modelHelp)}" />
        </label>
        <label title="${escapeHtml(serialNumberHelp)}">Serial number <span class="required">*</span> ${helpMarker(serialNumberHelp)}
          <input data-field="serialNumber" value="${escapeHtml(device.serialNumber)}" placeholder="SN123" title="${escapeHtml(serialNumberHelp)}" />
        </label>
        <label title="${escapeHtml(calibrationDateHelp)}">Calibration date <span class="required">*</span> ${helpMarker(calibrationDateHelp)}
          <input data-field="calibrationDate" type="date" value="${escapeHtml(device.calibrationDate)}" title="${escapeHtml(calibrationDateHelp)}" required />
        </label>
        <label title="${escapeHtml(firmwareHelp)}">Firmware version ${helpMarker(firmwareHelp)}
          <input data-field="firmwareVersion" value="${escapeHtml(device.firmwareVersion)}" placeholder="v1.2.3" title="${escapeHtml(firmwareHelp)}" />
        </label>
        <label class="wide" title="${escapeHtml(datasheetHelp)}">Datasheet ID <span class="required">*</span> ${helpMarker(datasheetHelp)}
          <select class="datasheet-select" data-field="datasheetId" title="${escapeHtml(datasheetHelp)}"></select>
          <span class="field-help">Required before export. The selected ID must match a device-datasheet record completed below.</span>
        </label>
        <div class="wide nested-editor" title="${escapeHtml(sensorsHelp)}">
          <div class="nested-editor-heading">
            <span>Sensors ${helpMarker(sensorsHelp)}</span>
            <button type="button" class="secondary-button small-button add-sensor-row">Add sensor</button>
          </div>
          <div class="nested-grid nested-grid-two nested-grid-header" aria-hidden="true">
            <span>Device sensor type <span class="required">*</span></span>
            <span>Sensor datasheet ID</span>
            <span></span>
          </div>
          <div class="device-sensors-list"></div>
          <span class="field-help">Sensors are optional. For each sensor you add, sensor type is required. Add a sensor datasheet ID only when that component has its own separate datasheet.</span>
        </div>
      </div>
    `;
    const select = card.querySelector("select");
    setSelectOptions(select, Array.from(new Set([...getDatasheetIds(), device.datasheetId].filter(Boolean))), "Add or import datasheet first");
    select.value = device.datasheetId;
    setupDeviceSensorEditor(card, device, sensorTypeHelp, sensorDatasheetHelp);
    card.querySelectorAll("input[data-field], textarea[data-field], select[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        device[input.dataset.field] = input.value.trim();
        updateCrossrefOptions();
        updatePreview();
      });
      input.addEventListener("change", () => {
        device[input.dataset.field] = input.value.trim();
        updateCrossrefOptions();
        updatePreview();
      });
    });
    card.querySelector("button").addEventListener("click", () => {
      state.devices.splice(index, 1);
      renderDevices();
      updateCrossrefOptions();
      updatePreview();
    });
    devicesList.appendChild(card);
  });
}

function addDevice() {
  state.devices.push(createDevice());
  renderDevices();
  updateCrossrefOptions();
  updatePreview();
}

function setupDeviceSensorEditor(card, device, sensorTypeHelp, sensorDatasheetHelp) {
  const list = card.querySelector(".device-sensors-list");
  const addButton = card.querySelector(".add-sensor-row");
  let rows = parseDeviceSensorRows(device.sensorsText);

  const renderRows = () => {
    list.innerHTML = "";
    rows.forEach((row, rowIndex) => {
      const wrapper = document.createElement("div");
      wrapper.className = "nested-grid nested-grid-two nested-row";
      wrapper.innerHTML = `
        <label title="${escapeHtml(sensorTypeHelp)}">
          <span class="sr-only">Device sensor type</span>
          <input data-sensor-field="type" value="${escapeHtml(row.type)}" placeholder="Photopic light sensor" title="${escapeHtml(sensorTypeHelp)}" />
        </label>
        <label title="${escapeHtml(sensorDatasheetHelp)}">
          <span class="sr-only">Sensor datasheet ID</span>
          <select data-sensor-field="datasheetId" title="${escapeHtml(sensorDatasheetHelp)}"></select>
        </label>
        <button type="button" class="remove-row small-button">Remove</button>
      `;
      const datasheetSelect = wrapper.querySelector("select");
      setSelectOptions(
        datasheetSelect,
        Array.from(new Set([...getSeparateSensorDatasheetIds(), row.datasheetId].filter(Boolean))),
        "No separate sensor datasheet"
      );
      datasheetSelect.value = row.datasheetId;
      wrapper.querySelectorAll("input, select").forEach((input) => {
        input.addEventListener("input", () => {
          rows[rowIndex][input.dataset.sensorField] = input.value.trim();
          device.sensorsText = deviceSensorRowsToText(rows);
          updatePreview();
        });
        input.addEventListener("change", () => {
          rows[rowIndex][input.dataset.sensorField] = input.value.trim();
          device.sensorsText = deviceSensorRowsToText(rows);
          updatePreview();
        });
      });
      wrapper.querySelector("button").addEventListener("click", () => {
        rows.splice(rowIndex, 1);
        device.sensorsText = deviceSensorRowsToText(rows);
        renderRows();
        updatePreview();
      });
      list.appendChild(wrapper);
    });
  };

  addButton.addEventListener("click", () => {
    rows.push({ type: "", datasheetId: "" });
    device.sensorsText = deviceSensorRowsToText(rows);
    renderRows();
    updatePreview();
  });

  renderRows();
}

function parseDeviceSensorRows(text) {
  const rows = String(text || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, datasheetId] = line.split("|").map((part) => part.trim());
      return { type: type || "", datasheetId: datasheetId || "" };
    });
  return rows;
}

function deviceSensorRowsToText(rows) {
  return rows
    .map((row) => [row.type, row.datasheetId].filter(Boolean).join(" | "))
    .filter(Boolean)
    .join("\n");
}

function renderDatasheets() {
  datasheetsList.innerHTML = "";
  const schema3 = String(fields.schemaVersion.value || "3.0.2").startsWith("3.");
  const datasheetRequired = new Set(state.entitySchemas.datasheet?.required || []);
  const modalityOptions = ["light", "accelerometer", "temperature", "other"];
  state.datasheets.forEach((datasheet, index) => {
    const card = document.createElement("div");
    card.className = "participant-card";
    const help = state.datasheetHelp || {};
    const spectralHelp = state.datasheetSpectralHelp || {};
    const channelHelp = state.datasheetChannelHelp || {};
    const idHelp = schemaHelpTitle(help.datasheet_id, "Datasheet ID referenced by devices");
    const versionHelp = schemaHelpTitle(help.datasheet_version, "Version label for this datasheet");
    const manufacturerHelp = schemaHelpTitle(help.datasheet_manufacturer, "Manufacturer of the sensor or device");
    const typeHelp = schemaHelpTitle(help.datasheet_type, "Type of sensor or device");
    const modalityHelp = schemaHelpTitle(help.datasheet_sensor_modality, "Select every modality measured or represented by this device or sensor");
    const modalityOtherHelp = schemaHelpTitle(help.datasheet_sensor_modality_other, "Name modalities that are not available in the controlled list");
    const modelHelp = schemaHelpTitle(help.datasheet_model, "Model of the sensor or device");
    const intervalHelp = schemaHelpTitle(help.datasheet_calibration_interval, schema3 ? "Optional device calibration interval in days" : "Required device calibration interval in days");
    const spectralHelpText = `${schemaHelpTitle(help.datasheet_calibration_spectral_sensitivity, "Spectral sensitivity calibration values")} Use one wavelength,relative pair per line.`;
    const wavelengthHelp = schemaHelpTitle(spectralHelp.datasheet_calibration_spectral_sensitivity_wavelength, "Wavelength in nm");
    const relativeHelp = schemaHelpTitle(spectralHelp.datasheet_calibration_spectral_sensitivity_relative, "Relative spectral sensitivity");
    const linearityHelp = schemaHelpTitle(help.datasheet_calibration_linearity, "Linearity calibration information");
    const directionalHelp = schemaHelpTitle(help.datasheet_calibration_directional_response, "Directional response calibration information");
    const rangeHelp = schemaHelpTitle(help.datasheet_calibration_range, "Response range information");
    const parametersHelp = schemaHelpTitle(help.datasheet_calibration_parameters, "Additional calibration or specification parameters for any modality");
    const selectedModalities = normalizeStringArray(datasheet.modalities);
    const includesLight = selectedModalities.includes("light");
    const includesOther = selectedModalities.includes("other");
    const modalityOptionsHtml = modalityOptions
      .map((value) => `<option value="${value}"${selectedModalities.includes(value) ? " selected" : ""}>${value}</option>`)
      .join("");
    const channelsHelp = `${schemaHelpTitle(help.datasheet_channel, "Information on channels")} Add one row per channel.`;
    const channelNrHelp = schemaHelpTitle(channelHelp.datasheet_channel_nr, "Channel number");
    const channelNameHelp = schemaHelpTitle(channelHelp.datasheet_channel_name, "Channel name as it appears in exported files");
    const channelUnitHelp = schemaHelpTitle(channelHelp.datasheet_channel_unit, "Channel unit");
    const channelDescriptionHelp = schemaHelpTitle(channelHelp.datasheet_channel_description, "Channel description");
    const headingLabel = datasheet.type ? `Datasheet ${index + 1}: ${datasheet.type}` : `Datasheet ${index + 1}`;
    card.innerHTML = `
      <div class="record-card-heading">
        <h3>${escapeHtml(headingLabel)}</h3>
        <button type="button" class="remove-row">Remove datasheet</button>
      </div>
      <div class="participant-fields">
        <label title="${escapeHtml(idHelp)}">Datasheet ID <span class="required">*</span> ${helpMarker(idHelp)}
          <input data-field="id" value="${escapeHtml(datasheet.id)}" placeholder="lumitech-lt100-v1.0" title="${escapeHtml(idHelp)}" />
        </label>
        <label title="${escapeHtml(versionHelp)}">Version ${helpMarker(versionHelp)}
          <input data-field="version" value="${escapeHtml(datasheet.version)}" placeholder="1.0" title="${escapeHtml(versionHelp)}" />
        </label>
        <label title="${escapeHtml(manufacturerHelp)}">Manufacturer <span class="required">*</span> ${helpMarker(manufacturerHelp)}
          <input data-field="manufacturer" value="${escapeHtml(datasheet.manufacturer)}" placeholder="Lumitech" title="${escapeHtml(manufacturerHelp)}" />
        </label>
        <label title="${escapeHtml(typeHelp)}">Type <span class="required">*</span> ${helpMarker(typeHelp)}
          <input data-field="type" value="${escapeHtml(datasheet.type)}" placeholder="Wearable light sensor" title="${escapeHtml(typeHelp)}" />
        </label>
        ${schema3 ? `<label title="${escapeHtml(modalityHelp)}">Sensor modalities <span class="required">*</span> ${helpMarker(modalityHelp)}
          <select data-field="modalities" multiple size="7" title="${escapeHtml(modalityHelp)}">${modalityOptionsHtml}</select>
          <span class="field-help">Select every applicable modality.</span>
        </label>
        <label title="${escapeHtml(modalityOtherHelp)}"${includesOther ? "" : " hidden"}>Other modality <span class="required">*</span> ${helpMarker(modalityOtherHelp)}
          <input data-field="modalityOther" value="${escapeHtml(datasheet.modalityOther)}" placeholder="Example: humidity" title="${escapeHtml(modalityOtherHelp)}" />
        </label>` : ""}
        <label title="${escapeHtml(modelHelp)}">Model <span class="required">*</span> ${helpMarker(modelHelp)}
          <input data-field="model" value="${escapeHtml(datasheet.model)}" placeholder="LT-100" title="${escapeHtml(modelHelp)}" />
        </label>
        <label title="${escapeHtml(intervalHelp)}">Calibration interval, days ${datasheetRequired.has("datasheet_calibration_interval") ? '<span class="required">*</span>' : ""} ${helpMarker(intervalHelp)}
          <input data-field="calibrationInterval" type="number" min="0" step="1" value="${escapeHtml(datasheet.calibrationInterval)}" placeholder="365" title="${escapeHtml(intervalHelp)}" />
        </label>
        <div class="wide nested-editor" title="${escapeHtml(spectralHelpText)}"${schema3 && !includesLight ? " hidden" : ""}>
          <div class="nested-editor-heading">
            <span>Spectral sensitivity ${datasheetRequired.has("datasheet_calibration_spectral_sensitivity") ? '<span class="required">*</span>' : ""} ${helpMarker(spectralHelpText)}</span>
            <button type="button" class="secondary-button small-button add-spectral-row">Add wavelength row</button>
          </div>
          <div class="nested-grid nested-grid-two nested-grid-header" aria-hidden="true">
            <span>Wavelength, nm <span class="required">*</span></span>
            <span>Relative sensitivity <span class="required">*</span></span>
            <span></span>
          </div>
          <div class="datasheet-spectral-list"></div>
          <span class="field-help">Add one row for each wavelength and its relative sensitivity value.</span>
        </div>
        <label title="${escapeHtml(linearityHelp)}"${schema3 && !includesLight ? " hidden" : ""}>Linearity ${datasheetRequired.has("datasheet_calibration_linearity") ? '<span class="required">*</span>' : ""} ${helpMarker(linearityHelp)}
          <input data-field="linearity" value="${escapeHtml(datasheet.linearity)}" placeholder="Example: +/-2%" title="${escapeHtml(linearityHelp)}" />
        </label>
        <label title="${escapeHtml(directionalHelp)}"${schema3 && !includesLight ? " hidden" : ""}>Directional response ${datasheetRequired.has("datasheet_calibration_directional_response") ? '<span class="required">*</span>' : ""} ${helpMarker(directionalHelp)}
          <input data-field="directionalResponse" value="${escapeHtml(datasheet.directionalResponse)}" placeholder="Example: cosine corrected" title="${escapeHtml(directionalHelp)}" />
        </label>
        <label title="${escapeHtml(rangeHelp)}"${schema3 && !includesLight ? " hidden" : ""}>Calibration range <span class="required">*</span> ${helpMarker(rangeHelp)}
          <input data-field="range" value="${escapeHtml(datasheet.range)}" placeholder="Example: 0-100000 lux" title="${escapeHtml(rangeHelp)}" />
        </label>
        ${schema3 ? `<label class="wide" title="${escapeHtml(parametersHelp)}">Additional calibration parameters ${helpMarker(parametersHelp)}
          <textarea data-field="calibrationParametersText" placeholder="accuracy | 0.2 | degrees C | Manufacturer specification">${escapeHtml(datasheet.calibrationParametersText)}</textarea>
          <span class="field-help">One parameter per line: name | value | unit | description.</span>
        </label>` : ""}
        <div class="wide nested-editor" title="${escapeHtml(channelsHelp)}">
          <div class="nested-editor-heading">
            <span>Channels ${datasheetRequired.has("datasheet_channel") ? '<span class="required">*</span>' : ""} ${helpMarker(channelsHelp)}</span>
            <button type="button" class="secondary-button small-button add-channel-row">Add channel</button>
          </div>
          <div class="nested-grid nested-grid-four nested-grid-header" aria-hidden="true">
            <span>Channel nr <span class="required">*</span></span>
            <span>Channel name <span class="required">*</span></span>
            <span>Unit</span>
            <span>Description</span>
            <span></span>
          </div>
          <div class="datasheet-channels-list"></div>
          <span class="field-help">${datasheetRequired.has("datasheet_channel") ? "At least one channel is required. " : "Channels are optional. "}For each channel you add, channel number and channel name are required; unit and description are optional.</span>
        </div>
      </div>
    `;
    setupDatasheetSpectralEditor(
      card,
      datasheet,
      wavelengthHelp,
      relativeHelp,
      datasheetRequired.has("datasheet_calibration_spectral_sensitivity"),
    );
    setupDatasheetChannelEditor(
      card,
      datasheet,
      channelNrHelp,
      channelNameHelp,
      channelUnitHelp,
      channelDescriptionHelp,
      datasheetRequired.has("datasheet_channel"),
    );
    card.querySelectorAll("input[data-field], textarea[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        datasheet[input.dataset.field] = input.value.trim();
        renderDevices();
        updateCrossrefOptions();
        updatePreview();
      });
    });
    const modalitySelect = card.querySelector('select[data-field="modalities"]');
    if (modalitySelect) {
      modalitySelect.addEventListener("change", () => {
        datasheet.modalities = Array.from(modalitySelect.selectedOptions, (option) => option.value);
        renderDatasheets();
        updatePreview();
      });
    }
    card.querySelector("button").addEventListener("click", () => {
      state.datasheets.splice(index, 1);
      renderDatasheets();
      renderDevices();
      updateCrossrefOptions();
      updatePreview();
    });
    datasheetsList.appendChild(card);
  });
}

function addDatasheet() {
  state.datasheets.push(createDatasheet());
  renderDatasheets();
  updateCrossrefOptions();
  updatePreview();
}

function setupDatasheetSpectralEditor(card, datasheet, wavelengthHelp, relativeHelp, required) {
  const list = card.querySelector(".datasheet-spectral-list");
  const addButton = card.querySelector(".add-spectral-row");
  let rows = parseDatasheetSpectralRows(datasheet.spectralSensitivityText);
  if (required && rows.length === 0) {
    rows = [{ wavelength: "", relative: "" }];
  }

  const renderRows = () => {
    list.innerHTML = "";
    rows.forEach((row, rowIndex) => {
      const wrapper = document.createElement("div");
      wrapper.className = "nested-grid nested-grid-two nested-row";
      wrapper.innerHTML = `
        <label title="${escapeHtml(wavelengthHelp)}">
          <span class="sr-only">Wavelength</span>
          <input data-spectral-field="wavelength" type="number" min="0" step="any" value="${escapeHtml(row.wavelength)}" placeholder="450" title="${escapeHtml(wavelengthHelp)}" />
        </label>
        <label title="${escapeHtml(relativeHelp)}">
          <span class="sr-only">Relative sensitivity</span>
          <input data-spectral-field="relative" type="number" step="any" value="${escapeHtml(row.relative)}" placeholder="0.85" title="${escapeHtml(relativeHelp)}" />
        </label>
        <button type="button" class="remove-row small-button">Remove</button>
      `;
      wrapper.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          rows[rowIndex][input.dataset.spectralField] = input.value.trim();
          datasheet.spectralSensitivityText = datasheetSpectralRowsToText(rows);
          updatePreview();
        });
      });
      wrapper.querySelector("button").addEventListener("click", () => {
        rows.splice(rowIndex, 1);
        datasheet.spectralSensitivityText = datasheetSpectralRowsToText(rows);
        renderRows();
        updatePreview();
      });
      list.appendChild(wrapper);
    });
  };

  addButton.addEventListener("click", () => {
    rows.push({ wavelength: "", relative: "" });
    datasheet.spectralSensitivityText = datasheetSpectralRowsToText(rows);
    renderRows();
    updatePreview();
  });

  renderRows();
}

function parseDatasheetSpectralRows(text) {
  const rows = String(text || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [wavelength, relative] = line.split(/[|,]/).map((part) => part.trim());
      return {
        wavelength: wavelength || "",
        relative: relative || "",
      };
    });
  return rows;
}

function datasheetSpectralRowsToText(rows) {
  return rows
    .map((row) => [row.wavelength, row.relative].filter(Boolean).join(","))
    .filter(Boolean)
    .join("\n");
}

function setupDatasheetChannelEditor(card, datasheet, channelNrHelp, channelNameHelp, channelUnitHelp, channelDescriptionHelp, required) {
  const list = card.querySelector(".datasheet-channels-list");
  const addButton = card.querySelector(".add-channel-row");
  let rows = parseDatasheetChannelRows(datasheet.channelsText);
  if (required && rows.length === 0) {
    rows = [{ nr: "", name: "", unit: "", description: "" }];
  }

  const renderRows = () => {
    list.innerHTML = "";
    rows.forEach((row, rowIndex) => {
      const wrapper = document.createElement("div");
      wrapper.className = "nested-grid nested-grid-four nested-row";
      wrapper.innerHTML = `
        <label title="${escapeHtml(channelNrHelp)}">
          <span class="sr-only">Channel number</span>
          <input data-channel-field="nr" type="number" min="1" step="1" value="${escapeHtml(row.nr)}" placeholder="1" title="${escapeHtml(channelNrHelp)}" />
        </label>
        <label title="${escapeHtml(channelNameHelp)}">
          <span class="sr-only">Channel name</span>
          <input data-channel-field="name" value="${escapeHtml(row.name)}" placeholder="broadband" title="${escapeHtml(channelNameHelp)}" />
        </label>
        <label title="${escapeHtml(channelUnitHelp)}">
          <span class="sr-only">Channel unit</span>
          <input data-channel-field="unit" value="${escapeHtml(row.unit)}" placeholder="lux" title="${escapeHtml(channelUnitHelp)}" />
        </label>
        <label title="${escapeHtml(channelDescriptionHelp)}">
          <span class="sr-only">Channel description</span>
          <input data-channel-field="description" value="${escapeHtml(row.description)}" placeholder="Broadband visible light" title="${escapeHtml(channelDescriptionHelp)}" />
        </label>
        <button type="button" class="remove-row small-button">Remove</button>
      `;
      wrapper.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          rows[rowIndex][input.dataset.channelField] = input.value.trim();
          datasheet.channelsText = datasheetChannelRowsToText(rows);
          updatePreview();
        });
      });
      wrapper.querySelector("button").addEventListener("click", () => {
        rows.splice(rowIndex, 1);
        datasheet.channelsText = datasheetChannelRowsToText(rows);
        renderRows();
        updatePreview();
      });
      list.appendChild(wrapper);
    });
  };

  addButton.addEventListener("click", () => {
    rows.push({ nr: "", name: "", unit: "", description: "" });
    datasheet.channelsText = datasheetChannelRowsToText(rows);
    renderRows();
    updatePreview();
  });

  renderRows();
}

function parseDatasheetChannelRows(text) {
  const rows = String(text || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [nr, name, unit, description] = line.split("|").map((part) => part.trim());
      return {
        nr: nr || "",
        name: name || "",
        unit: unit || "",
        description: description || "",
      };
    });
  return rows;
}

function datasheetChannelRowsToText(rows) {
  return rows
    .map((row) => [row.nr, row.name, row.unit, row.description].filter(Boolean).join(" | "))
    .filter(Boolean)
    .join("\n");
}

function detectDelimiter(line) {
  const candidates = [",", ";", "\t", "|"];
  const counts = candidates.map((candidate) => ({
    delimiter: candidate,
    count: (line.match(new RegExp(escapeRegExp(candidate), "g")) || []).length,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ",";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseTableText(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("Expected a header row and at least one data row.");
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index]?.trim() || "";
      return row;
    }, {});
  });
}

function normalizeHeader(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function findHeaderRow(lines) {
  let best = { index: 0, score: -1, delimiter: "," };
  const scanLimit = Math.min(lines.length, 80);

  for (let index = 0; index < scanLimit; index += 1) {
    const line = lines[index];
    const delimiter = detectDelimiter(line);
    const columns = parseDelimitedLine(line, delimiter).filter(Boolean);
    const normalizedColumns = new Set(columns.map(normalizeHeader).filter(Boolean));
    const score = normalizedColumns.size;

    if (score > best.score && columns.length > 1) {
      best = { index, score, delimiter };
    }
  }

  return best;
}

async function readFileHeader(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const detected = findHeaderRow(lines);
  const headerLine = lines[detected.index] || "";
  return {
    fileName: file.name,
    columns: parseDelimitedLine(headerLine, detected.delimiter).filter(Boolean),
    delimiter: detected.delimiter,
    headerRow: detected.index + 1,
  };
}

async function handleFileSelection(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }

  const headers = await Promise.all(files.map(readFileHeader));
  const first = headers[0];
  const mismatchedFiles = headers
    .filter((entry) => entry.columns.join("\u001f") !== first.columns.join("\u001f"))
    .map((entry) => entry.fileName);
  const group = activeGroup();

  group.files = files.map((file) => file.name);
  group.columns = first.columns;
  group.delimiter = first.delimiter;
  group.headerRow = first.headerRow;
  group.fileFormat = files[0].name.split(".").pop()?.toLowerCase() || "csv";
  group.name = group.role === "supporting" || group.auxiliary === true ? "Supporting file group" : "Primary file group";
  group.variableState = seedVariableState(group);
  group.datetimeDate = suggestDatetimeColumn(group.columns);

  syncControlsFromActiveGroup();
  fileSummary.textContent = `${files.length} file(s) selected for this participant file group. ${first.columns.length} columns detected from ${first.fileName}, delimiter "${formatDelimiter(first.delimiter)}", header row ${first.headerRow}.`;
  if (mismatchedFiles.length > 0) {
    fileWarning.hidden = false;
    fileWarning.textContent = `Column mismatch: ${mismatchedFiles.join(", ")} does not match the first file's columns. Create a separate file group for files with different structures.`;
  } else {
    fileWarning.hidden = true;
    fileWarning.textContent = "";
  }

  renderFileGroups();
  renderVariables();
  updatePreview();
}

function formatDelimiter(delimiter) {
  return delimiter === "\t" ? "tab" : delimiter;
}

function renderFileGroups() {
  fileGroupsList.innerHTML = "";
  state.fileGroups.forEach((group, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `file-group-chip${index === state.activeGroupIndex ? " active" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "file-group-button";
    button.textContent = `${index + 1}. ${group.files.length ? group.files.join(", ") : group.name}`;
    button.addEventListener("click", () => {
      syncActiveGroupFromControls();
      state.activeGroupIndex = index;
      syncControlsFromActiveGroup();
      renderTerms();
      renderFileGroups();
      renderVariables();
      updatePreview();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-file-group";
    removeButton.textContent = "Remove";
    removeButton.disabled = state.fileGroups.length === 1;
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      removeFileGroup(index);
    });

    wrapper.appendChild(button);
    wrapper.appendChild(removeButton);
    fileGroupsList.appendChild(wrapper);
  });
}

function reusableTemplateSnapshot(dataset, existingTemplate = null) {
  const snapshot = cloneJson(dataset);
  snapshot.datasetId = "";
  snapshot.participantId = "";
  snapshot.templateId = "";
  snapshot.excludedTemplateGroupIds = [];
  snapshot.fileGroups = (snapshot.fileGroups || []).map((group) => {
    const reusable = cloneJson(group);
    reusable.templateGroupId = reusable.templateGroupId || createBuilderId("group");
    reusable.files = [];
    if (reusable.datetimeSource === "collection") reusable.collectionDatetime = "";
    return reusable;
  });
  const excluded = new Set(dataset.excludedTemplateGroupIds || []);
  (existingTemplate?.dataset?.fileGroups || []).forEach((group) => {
    if (excluded.has(group.templateGroupId)
      && !snapshot.fileGroups.some((entry) => entry.templateGroupId === group.templateGroupId)) {
      snapshot.fileGroups.push(cloneJson(group));
    }
  });
  return snapshot;
}

function propagateTemplateValue(oldValue, newValue, currentValue) {
  if (valuesEqual(currentValue, oldValue)) return cloneJson(newValue);
  if (!oldValue || !newValue || !currentValue
    || Array.isArray(oldValue) || Array.isArray(newValue) || Array.isArray(currentValue)
    || typeof oldValue !== "object" || typeof newValue !== "object" || typeof currentValue !== "object") {
    return cloneJson(currentValue);
  }
  const result = cloneJson(currentValue);
  Object.keys(newValue).forEach((key) => {
    result[key] = key in oldValue
      ? propagateTemplateValue(oldValue[key], newValue[key], currentValue[key])
      : cloneJson(newValue[key]);
  });
  return result;
}

function applyTemplateUpdateToDataset(dataset, oldTemplate, newTemplate) {
  const identity = {
    datasetId: dataset.datasetId,
    participantId: dataset.participantId,
    templateId: dataset.templateId,
    excludedTemplateGroupIds: [...(dataset.excludedTemplateGroupIds || [])],
  };
  const currentGroups = dataset.fileGroups || [];
  const oldGroups = oldTemplate.dataset.fileGroups || [];
  const newGroups = newTemplate.dataset.fileGroups || [];
  const excluded = new Set(identity.excludedTemplateGroupIds);
  const manualGroups = currentGroups.filter((group) => !group.templateGroupId);
  const inheritedGroups = newGroups.flatMap((newGroup) => {
    if (excluded.has(newGroup.templateGroupId)) return [];
    const current = currentGroups.find((group) => group.templateGroupId === newGroup.templateGroupId);
    if (!current) return [cloneJson(newGroup)];
    const previous = oldGroups.find((group) => group.templateGroupId === newGroup.templateGroupId) || {};
    return [propagateTemplateValue(previous, newGroup, current)];
  });
  const withoutGroups = { ...dataset, fileGroups: undefined };
  const previousDefaults = { ...oldTemplate.dataset, fileGroups: undefined };
  const newDefaults = { ...newTemplate.dataset, fileGroups: undefined };
  Object.assign(dataset, propagateTemplateValue(previousDefaults, newDefaults, withoutGroups), identity);
  dataset.fileGroups = [...inheritedGroups, ...manualGroups];
}

function saveActiveDatasetAsTemplate() {
  syncActiveDatasetFromControls();
  const name = datasetTemplateName.value.trim();
  if (!name) {
    datasetTemplateStatus.textContent = "Enter a template name first.";
    return;
  }
  const dataset = activeDataset();
  const template = {
    templateId: createBuilderId("template"),
    name,
    dataset: reusableTemplateSnapshot(dataset),
  };
  state.datasetTemplates.push(template);
  state.activeTemplateEditorId = template.templateId;
  dataset.templateId = template.templateId;
  dataset.fileGroups.forEach((group, index) => {
    group.templateGroupId = template.dataset.fileGroups[index].templateGroupId;
  });
  datasetTemplateName.value = "";
  renderTemplateEditorControls();
  renderDatasetTemplateTools();
  updatePreview();
}

function createLinkedDatasetFromTemplate() {
  syncActiveDatasetFromControls();
  const template = state.datasetTemplates.find((entry) => entry.templateId === datasetTemplateSelect.value);
  if (!template) {
    datasetTemplateStatus.textContent = "Select a template first.";
    return;
  }
  const selectedParticipants = Array.from(datasetTemplateParticipants.querySelectorAll("input[type='checkbox']:checked"))
    .map((input) => input.value);
  const participants = selectedParticipants.length ? selectedParticipants : [""];
  participants.forEach((participantId) => {
    const dataset = cloneJson(template.dataset);
    dataset.datasetId = "";
    dataset.participantId = participantId;
    dataset.participantAssociated = participantId ? true : dataset.participantAssociated;
    dataset.templateId = template.templateId;
    dataset.excludedTemplateGroupIds = [];
    dataset.studyId = dataset.studyId || getStudyId();
    state.datasets.push(dataset);
  });
  state.activeDatasetIndex = state.datasets.length - 1;
  state.activeGroupIndex = 0;
  syncControlsFromActiveDataset();
  renderDatasetTemplateTools();
  updatePreview();
}

function updateSelectedDatasetTemplate() {
  syncActiveDatasetFromControls();
  const template = state.datasetTemplates.find((entry) => entry.templateId === state.activeTemplateEditorId);
  const dataset = activeDataset();
  if (!template || state.activeStep !== "templates") {
    datasetTemplateSaveStatus.textContent = "Select a saved template at the top of this page first.";
    return;
  }
  const linkedCount = state.datasets.filter((entry) => entry.templateId === template.templateId).length;
  if (!window.confirm(`Update ${template.name} and propagate inherited changes to ${linkedCount} linked dataset(s)? Local overrides and exclusions will be preserved.`)) {
    return;
  }
  dataset.fileGroups.forEach((group) => {
    group.templateGroupId = group.templateGroupId || createBuilderId("group");
  });
  const previous = cloneJson(template);
  const updated = {
    ...template,
    dataset: reusableTemplateSnapshot(dataset, template),
  };
  state.datasetTemplates[state.datasetTemplates.indexOf(template)] = updated;
  state.datasets.filter((entry) => entry.templateId === updated.templateId)
    .forEach((entry) => applyTemplateUpdateToDataset(entry, previous, updated));
  state.templateDraft = cloneJson(updated.dataset);
  state.templateDraft.templateId = updated.templateId;
  state.fileGroups = state.templateDraft.fileGroups;
  syncControlsFromActiveDataset();
  placeDatasetEditor("templates");
  renderTemplateEditorControls();
  renderDatasetTemplateTools();
  datasetTemplateSaveStatus.textContent = `Updated ${updated.name} and propagated inherited changes to ${linkedCount} linked dataset(s).`;
  updatePreview();
}

function detachActiveDatasetFromTemplate() {
  syncActiveDatasetFromControls();
  const dataset = activeDataset();
  if (!dataset?.templateId) {
    datasetTemplateStatus.textContent = "The active dataset is not linked to a template.";
    return;
  }
  dataset.templateId = "";
  dataset.excludedTemplateGroupIds = [];
  dataset.fileGroups.forEach((group) => { group.templateGroupId = ""; });
  renderDatasetTemplateTools();
  renderDatasetRecords();
}

function restoreExcludedTemplateGroup() {
  const dataset = activeDataset();
  const template = state.datasetTemplates.find((entry) => entry.templateId === dataset?.templateId);
  const groupId = excludedTemplateGroupSelect.value;
  const group = template?.dataset.fileGroups.find((entry) => entry.templateGroupId === groupId);
  if (!group) return;
  dataset.excludedTemplateGroupIds = (dataset.excludedTemplateGroupIds || []).filter((id) => id !== groupId);
  dataset.fileGroups.push(cloneJson(group));
  state.fileGroups = dataset.fileGroups;
  state.activeGroupIndex = dataset.fileGroups.length - 1;
  syncControlsFromActiveDataset();
  renderDatasetTemplateTools();
  updatePreview();
}

function renderDatasetTemplateTools() {
  const schema3 = String(fields.schemaVersion.value || "3.0.2").startsWith("3.");
  document.querySelector("#dataset-template-tools").hidden = !DATASET_TEMPLATES_ENABLED || !schema3 || state.activeStep !== "datasets";
  document.querySelector("#dataset-template-save-tools").hidden = !DATASET_TEMPLATES_ENABLED || !schema3 || state.activeStep !== "templates";
  const selected = datasetTemplateSelect.value;
  const selectedParticipants = new Set(Array.from(datasetTemplateParticipants.querySelectorAll("input[type='checkbox']:checked"))
    .map((input) => input.value));
  datasetTemplateSelect.innerHTML = '<option value="">Select template</option>'
    + state.datasetTemplates.map((template) => `<option value="${escapeHtml(template.templateId)}">${escapeHtml(template.name)}</option>`).join("");
  datasetTemplateSelect.value = state.datasetTemplates.some((template) => template.templateId === selected)
    ? selected
    : activeDataset()?.templateId || "";
  datasetTemplateParticipants.innerHTML = getParticipantIds()
    .map((participantId) => `
      <label>
        <input type="checkbox" value="${escapeHtml(participantId)}"${selectedParticipants.has(participantId) ? " checked" : ""} />
        <span>${escapeHtml(participantId)}</span>
      </label>
    `)
    .join("");
  const dataset = activeDataset();
  const templateReady = (dataset?.fileGroups || []).some((group) => (group.modalities || []).length > 0
    && group.role
    && group.dataState
    && (group.columns || []).length > 0);
  document.querySelector("#save-dataset-template").disabled = !templateReady;
  document.querySelector("#update-dataset-template").disabled = !templateReady || !state.activeTemplateEditorId || state.activeStep !== "templates";
  document.querySelector("#detach-dataset-template").hidden = state.activeStep === "templates";
  datasetTemplateSaveStatus.textContent = templateReady
    ? state.activeTemplateEditorId && state.activeStep === "templates"
      ? "Edit the selected template, then update it or save it as a separate new template."
      : "The current template structure is ready to save."
    : "Before saving, configure at least one file group with a modality, file role, data state, and detected variables.";
  const template = state.datasetTemplates.find((entry) => entry.templateId === dataset?.templateId);
  const excluded = new Set(dataset?.excludedTemplateGroupIds || []);
  const excludedGroups = (template?.dataset.fileGroups || []).filter((group) => excluded.has(group.templateGroupId));
  excludedTemplateGroupSelect.innerHTML = excludedGroups.map((group) => `<option value="${escapeHtml(group.templateGroupId)}">${escapeHtml(group.name)}</option>`).join("");
  document.querySelector("#restore-template-group-tools").hidden = excludedGroups.length === 0;
  datasetTemplateStatus.textContent = dataset?.templateId
    ? `Active dataset is linked to ${template?.name || "an unavailable template"}. Local changes are preserved as overrides.`
    : state.datasetTemplates.length
      ? `${state.datasetTemplates.length} template(s) available. Select one to create a linked dataset.`
      : "No templates created yet. Configure the current dataset below, then save its structure at the end of this page.";
}

function renderDatasetRecords() {
  if (!datasetRecordsList) {
    return;
  }

  datasetRecordsList.innerHTML = "";
  state.datasets.forEach((dataset, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `file-group-chip${index === state.activeDatasetIndex ? " active" : ""}`;

    const labelParts = [
      dataset.datasetId || "Untitled dataset",
      dataset.participantId ? `participant ${dataset.participantId}` : "",
      dataset.templateId ? "linked template" : "",
    ].filter(Boolean);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "file-group-button";
    button.textContent = `${index + 1}. ${labelParts.join(" / ")}`;
    button.addEventListener("click", () => {
      syncActiveDatasetFromControls();
      state.activeDatasetIndex = index;
      state.activeGroupIndex = 0;
      syncControlsFromActiveDataset();
      updatePreview();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-file-group";
    removeButton.textContent = "Remove";
    removeButton.disabled = state.datasets.length === 1;
    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      removeDatasetRecord(index);
    });

    wrapper.appendChild(button);
    wrapper.appendChild(removeButton);
    datasetRecordsList.appendChild(wrapper);
  });
  renderDatasetTemplateTools();
}

function addDatasetRecord() {
  syncActiveDatasetFromControls();
  const next = createDatasetRecord();
  next.studyId = getStudyId();
  state.datasets.push(next);
  state.activeDatasetIndex = state.datasets.length - 1;
  state.activeGroupIndex = 0;
  syncControlsFromActiveDataset();
  updatePreview();
}

function removeDatasetRecord(index) {
  if (state.datasets.length === 1) {
    return;
  }
  syncActiveDatasetFromControls();
  state.datasets.splice(index, 1);
  if (state.activeDatasetIndex >= state.datasets.length) {
    state.activeDatasetIndex = state.datasets.length - 1;
  } else if (index < state.activeDatasetIndex) {
    state.activeDatasetIndex -= 1;
  }
  state.activeGroupIndex = 0;
  syncControlsFromActiveDataset();
  updatePreview();
}

function addFileGroup() {
  syncActiveGroupFromControls();
  state.fileGroups.push(createFileGroup(`File group ${state.fileGroups.length + 1}`));
  state.activeGroupIndex = state.fileGroups.length - 1;
  syncControlsFromActiveGroup();
  renderTerms();
  renderFileGroups();
  renderVariables();
  updatePreview();
}

function removeFileGroup(index) {
  if (state.fileGroups.length === 1) {
    return;
  }
  const [removed] = state.fileGroups.splice(index, 1);
  const dataset = activeDataset();
  if (dataset?.templateId && removed?.templateGroupId) {
    dataset.excludedTemplateGroupIds = Array.from(new Set([
      ...(dataset.excludedTemplateGroupIds || []),
      removed.templateGroupId,
    ]));
  }
  if (state.activeGroupIndex >= state.fileGroups.length) {
    state.activeGroupIndex = state.fileGroups.length - 1;
  } else if (index < state.activeGroupIndex) {
    state.activeGroupIndex -= 1;
  }
  syncControlsFromActiveGroup();
  renderTerms();
  renderFileGroups();
  renderVariables();
  renderDatasetTemplateTools();
  updatePreview();
}

function syncControlsFromActiveGroup() {
  const group = activeGroup();
  if (!group) {
    return;
  }
  setPendingSelectValue(fields.deviceId, group.deviceId || "");
  fields.fileModality.querySelectorAll("input[name='file-modality']").forEach((input) => {
    input.checked = (group.modalities || []).includes(input.value);
  });
  fields.fileModalityOther.value = group.modalityOther || "";
  fields.fileModalityOtherType.value = group.modalityOtherType || "";
  fields.fileInstrumentType.value = group.instrumentType || "";
  fields.fileInstrumentName.value = group.instrumentName || "";
  fields.fileCollectionMethod.value = group.collectionMethod || "";
  fields.fileSoftwareName.value = group.softwareName || "";
  fields.fileCollectionMethodOther.value = group.collectionMethodOther || "";
  fields.fileRecordedBy.value = group.recordedBy || "";
  fields.fileRecordedByOther.value = group.recordedByOther || "";
  fields.fileDescription.value = group.description || "";
  fields.deviceLocation.value = group.deviceLocation || "";
  fields.deviceLocationType.value = group.deviceLocationType || "";
  syncDeviceLocationTypeControls();
  syncFileModalityControls();
  fields.temporalResolutionType.value = group.temporalResolutionType || "fixed_interval";
  fields.samplingInterval.value = group.samplingInterval ?? "";
  fields.temporalResolutionUnit.value = group.temporalResolutionUnit || "";
  syncTemporalResolutionControls();
  fields.instructions.value = group.instructions || "";
  fields.fileFormat.value = group.fileFormat;
  fields.encoding.value = group.encoding;
  fields.headerRow.value = group.headerRow === "" ? "" : String(group.headerRow);
  fields.fileTimezone.value = group.fileTimezone;
  fields.auxiliary.value = group.auxiliary === "" ? "" : String(Boolean(group.auxiliary));
  fields.fileRole.value = group.role || "";
  fields.dataState.value = group.dataState || "";
  fields.preprocessingBol.value = group.preprocessingBol === "" ? "" : String(Boolean(group.preprocessingBol));
  fields.preprocessingDesc.value = group.preprocessingDesc || "";
  syncFileRoleDataStateControls();
  fields.datetimeSource.value = group.datetimeSource || "column";
  fields.collectionDatetime.value = group.collectionDatetime || "";
  fields.datetimeDateformat.value = group.datetimeDateformat || "";
  fields.datetimeTimeformat.value = group.datetimeTimeformat || "";
  refreshDatetimeColumnOptions(group);
  fields.datetimeDate.value = group.datetimeDate || "";
  fields.datetimeTime.value = group.datetimeTime || "";
  syncDatetimeControls();
  fileInput.value = "";
  fileSummary.textContent = group.files.length
    ? `${group.files.length} file(s) in active group: ${group.files.join(", ")}.`
    : "No file selected for this group yet.";
  fileWarning.hidden = true;
  fileWarning.textContent = "";
}

function syncActiveGroupFromControls() {
  const group = activeGroup();
  if (!group) {
    return;
  }
  group.modalities = selectedFileModalities();
  group.modalityOther = fields.fileModalityOther.value.trim();
  group.modalityOtherType = fields.fileModalityOtherType.value || "";
  group.instrumentType = fields.fileInstrumentType.value || "";
  group.instrumentName = fields.fileInstrumentName.value.trim();
  group.collectionMethod = fields.fileCollectionMethod.value || "";
  group.softwareName = fields.fileSoftwareName.value.trim();
  group.collectionMethodOther = fields.fileCollectionMethodOther.value.trim();
  group.recordedBy = fields.fileRecordedBy.value || "";
  group.recordedByOther = fields.fileRecordedByOther.value.trim();
  group.description = fields.fileDescription.value.trim();
  group.deviceId = fields.deviceId.value || "";
  group.deviceLocation = fields.deviceLocation.value.trim();
  group.deviceLocationType = fields.deviceLocationType.value || "";
  group.temporalResolutionType = fields.temporalResolutionType.value || "";
  group.samplingInterval = fields.samplingInterval.value;
  group.temporalResolutionUnit = fields.temporalResolutionUnit.value.trim();
  group.instructions = fields.instructions.value.trim();
  group.fileFormat = fields.fileFormat.value || "";
  group.encoding = fields.encoding.value || "";
  group.headerRow = fields.headerRow.value === "" ? "" : Number(fields.headerRow.value);
  group.fileTimezone = fields.fileTimezone.value || "";
  group.auxiliary = fields.auxiliary.value === "" ? "" : fields.auxiliary.value === "true";
  group.role = fields.fileRole.value || "";
  group.dataState = fields.dataState.value || "";
  group.name = group.role === "supporting" || group.auxiliary === true
    ? "Supporting file group"
    : "Primary file group";
  group.preprocessingBol = (fields.schemaVersion.value || "3.0.2") === "3.0.2"
    ? group.dataState === "" ? "" : group.dataState === "processed"
    : fields.preprocessingBol.value === "" ? "" : fields.preprocessingBol.value === "true";
  group.preprocessingDesc = fields.preprocessingDesc.value || "";
  group.datetimeSource = fields.datetimeSource.value || "column";
  group.collectionDatetime = fields.collectionDatetime.value || "";
  group.datetimeDate = fields.datetimeDate.value || "";
  group.datetimeDateformat = fields.datetimeDateformat.value || "";
  group.datetimeTime = fields.datetimeTime.value || "";
  group.datetimeTimeformat = fields.datetimeTimeformat.value || "";
  group.variableState = collectCurrentVariableState(group);
}

function syncDeviceLocationTypeControls() {
}

function fileGroupUsesSensor(group = activeGroup()) {
  return (group?.modalities || []).some((modality) => FILE_SENSOR_MODALITIES.has(modality))
    || ((group?.modalities || []).includes("other") && group?.modalityOtherType === "sensor");
}

function fileGroupRequiresDevice(group = activeGroup()) {
  return fileGroupUsesSensor(group);
}

function fileGroupAllowsDevice(group = activeGroup()) {
  return fileGroupRequiresDevice(group)
    || (group?.modalities || []).some((modality) => ["questionnaire", "diary", "wear_log"].includes(modality));
}

function selectedFileModalities() {
  return Array.from(fields.fileModality.querySelectorAll("input[name='file-modality']:checked"))
    .map((input) => input.value);
}

function syncFileModalityControls() {
  const schema3 = (fields.schemaVersion.value || "3.0.2") === "3.0.2";
  const modalities = selectedFileModalities();
  const includesOther = modalities.includes("other");
  const includesSensor = modalities.some((modality) => FILE_SENSOR_MODALITIES.has(modality));
  const includesNonDevice = modalities.some((modality) => FILE_NON_DEVICE_MODALITIES.has(modality));
  const selectedInstrumentType = modalities.find((modality) => FILE_NON_DEVICE_MODALITIES.has(modality)) || "";
  const otherType = includesOther ? fields.fileModalityOtherType.value : "";
  const effectiveSensor = includesSensor || otherType === "sensor";
  const effectiveNonDevice = includesNonDevice || otherType === "non_device";
  fields.fileModality.querySelectorAll("input[name='file-modality']").forEach((input) => {
    if (!schema3 || input.checked || (effectiveSensor && effectiveNonDevice)) {
      input.disabled = false;
    } else if (effectiveSensor) {
      input.disabled = FILE_NON_DEVICE_MODALITIES.has(input.value);
    } else if (effectiveNonDevice) {
      input.disabled = FILE_SENSOR_MODALITIES.has(input.value)
        || input.value === "other"
        || (FILE_NON_DEVICE_MODALITIES.has(input.value) && input.value !== selectedInstrumentType);
    } else {
      input.disabled = false;
    }
  });
  const sensorTypeOption = fields.fileModalityOtherType.querySelector("option[value='sensor']");
  const nonDeviceTypeOption = fields.fileModalityOtherType.querySelector("option[value='non_device']");
  sensorTypeOption.disabled = includesNonDevice && otherType !== "sensor";
  nonDeviceTypeOption.disabled = includesSensor && otherType !== "non_device";
  const modalityWarning = document.querySelector("#file-modality-warning");
  const incompatibleKnownModalities = includesSensor && includesNonDevice;
  const incompatibleOtherType = (otherType === "sensor" && includesNonDevice)
    || (otherType === "non_device" && includesSensor);
  modalityWarning.hidden = !schema3 || (!incompatibleKnownModalities && !incompatibleOtherType);
  modalityWarning.textContent = incompatibleOtherType
    ? `The selected other modality type (${otherType === "sensor" ? "sensor" : "non-device"}) conflicts with another selected modality. Correct the type or place the incompatible data in a separate file group.`
    : incompatibleKnownModalities
      ? "Sensor and non-device modalities cannot share a file group. Uncheck one category and create a separate file group for it."
      : "";
  fields.fileInstrumentType.value = selectedInstrumentType;
  const group = activeGroup();
  if (group) group.instrumentType = selectedInstrumentType;
  document.querySelector("#file-instrument-field").hidden = !schema3 || !selectedInstrumentType;
  const softwareMethod = fields.fileCollectionMethod.value === "software";
  const otherMethod = fields.fileCollectionMethod.value === "other";
  const otherRecorder = fields.fileRecordedBy.value === "other";
  document.querySelector("#file-software-name-field").hidden = !schema3 || !selectedInstrumentType || !softwareMethod;
  document.querySelector("#file-collection-method-other-field").hidden = !schema3 || !selectedInstrumentType || !otherMethod;
  document.querySelector("#file-recorded-by-other-field").hidden = !schema3 || !selectedInstrumentType || !otherRecorder;
  document.querySelector("#file-modality-field").hidden = !schema3;
  document.querySelector("#file-modality-other-field").hidden = !schema3 || !includesOther;
  document.querySelector("#file-modality-other-type-field").hidden = !schema3 || !includesOther;
  const controlGroup = {
    modalities,
    modalityOtherType: fields.fileModalityOtherType.value,
  };
  const allowsDevice = fileGroupAllowsDevice(controlGroup);
  const requiresDevice = fileGroupRequiresDevice(controlGroup);
  [
    "#file-device-id-field",
    "#file-device-location-field",
    "#file-device-location-type-field",
  ].forEach((selector) => {
    document.querySelector(selector).hidden = schema3 && !allowsDevice;
  });
  [
    [fields.deviceId, "#file-device-id-required"],
    [fields.deviceLocation, "#file-device-location-required"],
    [fields.deviceLocationType, "#file-device-location-type-required"],
  ].forEach(([field, requiredSelector]) => {
    field.required = !schema3 || requiresDevice;
    document.querySelector(requiredSelector).hidden = schema3 && !requiresDevice;
  });
  if (schema3 && !allowsDevice) {
    fields.deviceId.value = "";
    fields.deviceLocation.value = "";
    fields.deviceLocationType.value = "";
    const active = activeGroup();
    if (active) {
      active.deviceId = "";
      active.deviceLocation = "";
      active.deviceLocationType = "";
    }
  }
}

function syncFileRoleDataStateControls() {
  const schema3 = (fields.schemaVersion.value || "3.0.2") === "3.0.2";
  const descriptionField = document.querySelector("#preprocessing-description-field");
  document.querySelector("#legacy-auxiliary-field").hidden = schema3;
  document.querySelector("#legacy-preprocessing-status-field").hidden = schema3;
  document.querySelector("#file-role-field").hidden = !schema3;
  document.querySelector("#data-state-field").hidden = !schema3;
  if (schema3) {
    const processed = fields.dataState.value === "processed";
    fields.preprocessingBol.value = fields.dataState.value === "" ? "" : String(processed);
    descriptionField.hidden = !processed;
    fields.preprocessingDesc.disabled = !processed;
    fields.preprocessingDesc.placeholder = "Describe preprocessing and provenance";
    if (fields.dataState.value === "raw") {
      fields.preprocessingDesc.value = "";
      const group = activeGroup();
      if (group) group.preprocessingDesc = "";
    }
  } else {
    descriptionField.hidden = false;
    fields.preprocessingDesc.disabled = false;
    fields.preprocessingDesc.placeholder = "Required if preprocessing was applied";
  }
}

function syncTemporalResolutionControls() {
  const schema3 = (fields.schemaVersion.value || "3.0.2") === "3.0.2";
  if (!schema3 && fields.temporalResolutionType?.value !== "fixed_interval") {
    fields.temporalResolutionType.value = "fixed_interval";
  }
  const eventBasedOption = fields.temporalResolutionType?.querySelector('option[value="event_based"]');
  if (eventBasedOption) {
    eventBasedOption.disabled = !schema3;
    eventBasedOption.hidden = !schema3;
  }
  const isFixedInterval = !schema3 || fields.temporalResolutionType?.value === "fixed_interval";
  fields.samplingInterval.disabled = !isFixedInterval;
  fields.temporalResolutionUnit.disabled = !isFixedInterval;
  fields.samplingInterval.required = isFixedInterval;
  fields.temporalResolutionUnit.required = isFixedInterval;
  document.querySelector("#temporal-resolution-value-required").hidden = !isFixedInterval;
  document.querySelector("#temporal-resolution-unit-required").hidden = !isFixedInterval;
}

function renderTerms() {
  const group = activeGroup();
  if (!group) {
    termsList.innerHTML = "";
    return;
  }
  ensureOtherTerm(group);
  termsList.innerHTML = "";

  group.terms.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "term-row";
    row.innerHTML = `
      <input type="text" class="term-token" data-index="${index}" value="${escapeHtml(entry.term)}" placeholder="Example: melEDI" aria-label="Term token" ${entry.term === "other" ? "readonly" : ""} />
      <input type="text" class="term-label" data-index="${index}" value="${escapeHtml(entry.label || "")}" placeholder="Example: Melanopic EDI" aria-label="Term label" />
      <button type="button" class="remove-term" data-index="${index}" ${entry.term === "other" ? "disabled" : ""}>Remove</button>
    `;
    termsList.appendChild(row);
  });

  termsList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", syncTermsFromInputs);
  });
  termsList.querySelectorAll(".remove-term").forEach((button) => {
    button.addEventListener("click", removeTerm);
  });
}

function ensureOtherTerm(group = activeGroup()) {
  if (!group) {
    return;
  }
  const hasOther = group.terms.some((entry) => entry.term === "other");
  if (!hasOther) {
    group.terms.push({ term: "other", label: "Other" });
  }
}

function syncTermsFromInputs() {
  const group = activeGroup();
  const rows = Array.from(termsList.querySelectorAll(".term-row"));
  group.terms = rows
    .map((row) => ({
      term: row.querySelector(".term-token").value.trim(),
      label: row.querySelector(".term-label").value.trim() || null,
    }))
    .filter((entry) => entry.term.length > 0);
  ensureOtherTerm(group);
  renderVariables();
  updatePreview();
}

function addTerm() {
  const group = activeGroup();
  group.terms.splice(Math.max(group.terms.length - 1, 0), 0, { term: "new term", label: "New term" });
  renderTerms();
  renderVariables();
  updatePreview();
}

function removeTerm(event) {
  const group = activeGroup();
  const index = Number(event.currentTarget.dataset.index);
  if (group.terms[index]?.term === "other") {
    return;
  }
  group.terms.splice(index, 1);
  renderTerms();
  renderVariables();
  updatePreview();
}

function refreshDatetimeColumnOptions(group = activeGroup()) {
  if (!group) {
    fields.datetimeDate.innerHTML = '<option value="">None / collection date value</option>';
    fields.datetimeTime.innerHTML = '<option value="">None / collection date value</option>';
    return;
  }
  const columns = Array.from(new Set([
    ...(group.columns || []),
    group.datetimeDate,
    group.datetimeTime,
  ].filter(Boolean)));
  const options = ['<option value="">None / collection date value</option>'].concat(
    columns.map((column) => `<option value="${escapeHtml(column)}">${escapeHtml(column)}</option>`),
  );
  fields.datetimeDate.innerHTML = options.join("");
  fields.datetimeTime.innerHTML = options.join("");
}

function renderVariables() {
  const group = activeGroup();
  variablesTable.innerHTML = "";

  if (!group) {
    validationSummary.textContent = "Add a dataset file group to detect columns.";
    validationSummary.className = "validation-summary";
    return;
  }

  if (group.columns.length === 0) {
    validationSummary.textContent = "Select file(s) to detect columns for this group.";
    validationSummary.className = "validation-summary";
    return;
  }

  const termOptions = group.terms
    .filter((entry) => entry.term)
    .map((entry) => `<option value="${escapeHtml(entry.term)}">${escapeHtml(entry.term)}</option>`)
    .join("");
  const schema3 = (fields.schemaVersion.value || "3.0.2") === "3.0.2";
  const factorTypeGuidance = "Select Factor only for categorical variables with a finite set of defined levels, such as 0 = No and 1 = Yes. A numerical factor, coefficient, ratio, proportion, percentage, score, count, or other quantitatively meaningful value must be Numeric or Integer.";

  if (schema3) {
    const unitOptions = document.createElement("datalist");
    unitOptions.id = "ucum-unit-options";
    unitOptions.innerHTML = `
      <option value="1">dimensionless</option>
      <option value="{count}">count</option>
      <option value="{score}">score</option>
      <option value="%">percent</option>
      <option value="s">second</option>
      <option value="min">minute</option>
      <option value="h">hour</option>
      <option value="d">day</option>
      <option value="lx">lux</option>
      <option value="Cel">degree Celsius</option>
      <option value="m">metre</option>
      <option value="m/s">metres per second</option>
      <option value="m/s2">metres per second squared</option>
      <option value="Hz">hertz</option>
    `;
    variablesTable.appendChild(unitOptions);
  }

  const header = document.createElement("div");
  header.className = `variable-row variable-header${schema3 ? " schema-3-variable-row" : ""}`;
  header.innerHTML = `
    <span title="A principal or default variable used when analysing this file group.">Primary variable</span>
    <span>File column</span>
    <span>Label</span>
    ${schema3 ? "<span>Description / full question</span>" : ""}
    <span>${schema3 ? "Unit (UCUM preferred)" : "Units"}</span>
    <span>Calibration</span>
    ${schema3 ? "<span>Type</span><span>Factor levels</span>" : ""}
    <span>Semantic term</span>
    <span>Other name</span>
  `;
  variablesTable.appendChild(header);

  group.columns.forEach((column) => {
    const saved = group.variableState[column] || {};
    const term = saved.term || guessTerm(column);
    const variableType = saved.type || "";
    const unitEnabled = !schema3 || ["numeric", "integer"].includes(variableType);
    const row = document.createElement("div");
    row.className = `variable-row${schema3 ? " schema-3-variable-row" : ""}`;
    row.innerHTML = `
      <input type="checkbox" class="primary-check" data-column="${escapeHtml(column)}" aria-label="Select ${escapeHtml(column)} as a primary variable" ${saved.primary ? "checked" : ""} ${!schema3 && group.auxiliary ? "disabled" : ""} />
      <strong>${escapeHtml(column)}</strong>
      <input type="text" class="label-input" data-column="${escapeHtml(column)}" value="${escapeHtml(saved.label || column)}" aria-label="Label for ${escapeHtml(column)}" />
      ${schema3 ? `<textarea class="description-input" data-column="${escapeHtml(column)}" aria-label="Description or full question for ${escapeHtml(column)}" placeholder="Full question, source wording, or interpretation">${escapeHtml(saved.description || "")}</textarea>` : ""}
      <input type="text" class="unit-input" data-column="${escapeHtml(column)}" value="${escapeHtml(unitEnabled ? (saved.unit || guessUnit(column)) : "")}" aria-label="Unit for ${escapeHtml(column)}" title="${unitEnabled ? "Unit is required for numeric and integer variables. Choose a UCUM code or enter a precise custom unit." : "Units do not apply to string, boolean, or factor variables."}" ${schema3 ? 'list="ucum-unit-options"' : ""} ${unitEnabled ? "" : "disabled"} />
      <input type="text" class="calibration-input" data-column="${escapeHtml(column)}" value="${escapeHtml(saved.calibration || "N/A")}" aria-label="Calibration for ${escapeHtml(column)}" />
      ${schema3 ? `
        <select class="type-select" data-column="${escapeHtml(column)}" aria-label="Type for ${escapeHtml(column)}" title="${escapeHtml(factorTypeGuidance)}">
          <option value="">Select type</option>
          <option value="string">String</option>
          <option value="boolean">Boolean</option>
          <option value="numeric">Numeric (quantitative)</option>
          <option value="integer">Integer (quantitative)</option>
          <option value="factor">Factor (categorical levels)</option>
        </select>
        <textarea class="factor-levels-input" data-column="${escapeHtml(column)}" aria-label="Factor levels for ${escapeHtml(column)}" placeholder="value | label | optional description" ${variableType === "factor" ? "" : "disabled"}>${escapeHtml(saved.factorLevelsText || "")}</textarea>
      ` : ""}
      <select class="term-select" data-column="${escapeHtml(column)}" aria-label="Semantic term for ${escapeHtml(column)}">${termOptions}</select>
      <input type="text" class="other-name-input" data-column="${escapeHtml(column)}" value="${escapeHtml(saved.variableName || column)}" aria-label="Other variable name for ${escapeHtml(column)}" />
    `;
    variablesTable.appendChild(row);
    row.querySelector(".term-select").value = group.terms.some((entry) => entry.term === term) ? term : "other";
    if (schema3) {
      row.querySelector(".type-select").value = variableType;
      row.querySelector(".type-select").addEventListener("change", (event) => {
        const isFactor = event.target.value === "factor";
        const isQuantitative = ["numeric", "integer"].includes(event.target.value);
        row.querySelector(".factor-levels-input").disabled = !isFactor;
        const unitInput = row.querySelector(".unit-input");
        unitInput.disabled = !isQuantitative;
        unitInput.title = isQuantitative
          ? "Unit is required for numeric and integer variables. Choose a UCUM code or enter a precise custom unit."
          : "Units do not apply to string, boolean, or factor variables.";
        if (!isQuantitative) {
          unitInput.value = "";
        }
      });
    }
  });

  variablesTable.querySelectorAll("input, select, textarea").forEach((input) => {
    input.addEventListener("input", () => {
      group.variableState = collectCurrentVariableState(group);
      updatePreview();
    });
    input.addEventListener("change", enforcePrimaryLimit);
  });

  validationSummary.textContent = `${group.columns.length} variables detected in the active file group. Terms come from this file group's variable terms.`;
  validationSummary.className = "validation-summary ok";
}

function seedVariableState(group) {
  const existing = group.variableState || {};
  const seeded = {};
  group.columns.forEach((column) => {
    seeded[column] = existing[column] || {
      primary: false,
      label: column,
      description: "",
      unit: guessUnit(column),
      calibration: "N/A",
      type: "",
      factorLevelsText: "",
      term: guessTerm(column),
      variableName: column,
    };
  });
  return seeded;
}

function collectCurrentVariableState(group) {
  const current = { ...(group.variableState || {}) };
  document.querySelectorAll(".variable-row").forEach((row) => {
    const column = row.querySelector("[data-column]")?.dataset.column;
    if (!column) {
      return;
    }
    current[column] = {
      primary: row.querySelector(".primary-check")?.checked || false,
      label: row.querySelector(".label-input")?.value || "",
      description: row.querySelector(".description-input")?.value || "",
      unit: row.querySelector(".unit-input")?.value || "",
      calibration: row.querySelector(".calibration-input")?.value || "",
      type: row.querySelector(".type-select")?.value || current[column]?.type || "",
      factorLevelsText: row.querySelector(".factor-levels-input")?.value || "",
      term: row.querySelector(".term-select")?.value || "other",
      variableName: row.querySelector(".other-name-input")?.value || column,
    };
  });
  return current;
}

function enforcePrimaryLimit(event) {
  const selected = getPrimaryVariables(activeGroup());
  if (selected.length > 4 && event.target.classList.contains("primary-check")) {
    event.target.checked = false;
    validationSummary.textContent = "Choose up to four primary variables.";
    validationSummary.className = "validation-summary warning";
  }
  activeGroup().variableState = collectCurrentVariableState(activeGroup());
  updatePreview();
}

function guessUnit(column) {
  const normalized = column.toLowerCase();
  if (normalized.includes("lux") || normalized.includes("light")) return "lx";
  if (normalized.includes("temperature")) return "Cel";
  if (normalized.includes("time") || normalized.includes("date")) return "N/A";
  return "Unknown";
}

function guessTerm(column) {
  const normalized = column.toLowerCase();
  const terms = activeGroup().terms.map((entry) => entry.term);
  if ((normalized.includes("lux") || normalized === "light") && terms.includes("photopic illuminance")) {
    return "photopic illuminance";
  }
  if ((normalized.includes("medi") || normalized.includes("melanopic")) && terms.includes("melEDI")) {
    return "melEDI";
  }
  return "other";
}

function getPrimaryVariables(group) {
  return Object.entries(group.variableState || {})
    .filter(([, entry]) => entry.primary)
    .map(([column]) => column)
    .filter((column) => group.columns.includes(column));
}

function formatFactorLevels(levels) {
  if (!Array.isArray(levels)) return "";
  return levels.map((level) => [level.value, level.label, level.description]
    .filter((value, index) => index < 2 || value)
    .join(" | ")).join("\n");
}

function parseFactorLevels(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [value = "", label = "", ...descriptionParts] = line.split("|").map((part) => part.trim());
    return {
      value,
      label,
      description: descriptionParts.join(" | ") || null,
    };
  });
}

function getVariableMetadata(group, schemaVersion) {
  return group.columns.map((column) => {
    const saved = group.variableState[column] || {};
    const term = saved.term || "other";
    const termObject = { variable_term: term };

    if (term === "other") {
      termObject.variable_name = saved.variableName || column;
    }

    const metadata = {
      dataset_file_variables_name: column,
      dataset_file_variables_labels: saved.label || column,
      dataset_file_variables_calibration: saved.calibration || null,
      dataset_file_variables_term: termObject,
    };
    if (schemaVersion === "3.0.2") {
      metadata.dataset_file_variables_type = saved.type || "";
      if (saved.description) {
        metadata.dataset_file_variables_description = saved.description;
      }
      if (saved.type === "factor") {
        metadata.dataset_file_variables_factor_levels = parseFactorLevels(saved.factorLevelsText);
      }
      if (["numeric", "integer"].includes(saved.type)) {
        metadata.dataset_file_variables_units = saved.unit || "";
      }
    } else {
      metadata.dataset_file_variables_units = saved.unit || "Unknown";
    }
    return metadata;
  });
}

function buildDatasetFile(group, schemaVersion) {
  const preprocessingDesc = group.preprocessingDesc
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const datasetFile = {
    dataset_file_names: group.files.map((fileName) => `data/datasets/${fileName}`),
    dataset_file_format: group.fileFormat || "",
    dataset_file_encoding: [group.encoding || ""],
    dataset_file_timezone: group.fileTimezone || "",
    dataset_file_header_row: group.headerRow === "" ? null : Number(group.headerRow),
    dataset_file_preprocessing: {
      dataset_file_preprocessing_bol: schemaVersion === "3.0.2"
        ? group.dataState === "processed"
        : group.preprocessingBol === "" ? null : Boolean(group.preprocessingBol),
      dataset_file_preprocessing_desc: schemaVersion === "3.0.2"
        ? group.dataState === "processed" ? preprocessingDesc : null
        : group.preprocessingBol === true ? preprocessingDesc : null,
    },
    dataset_file_variables: getVariableMetadata(group, schemaVersion),
  };

  if (schemaVersion === "3.0.2") {
    datasetFile.dataset_file_modality = [...(group.modalities || [])];
    if ((group.modalities || []).includes("other")) {
      datasetFile.dataset_file_modality_other = group.modalityOther || "";
      datasetFile.dataset_file_modality_other_type = group.modalityOtherType || "";
    }
    const instrumentType = (group.modalities || []).find((modality) => FILE_NON_DEVICE_MODALITIES.has(modality));
    if (instrumentType) {
      datasetFile.dataset_file_instrument = {
        instrument_type: instrumentType,
        instrument_name: group.instrumentName || "",
        collection_method: group.collectionMethod || "",
        recorded_by: group.recordedBy || "",
      };
      if (group.collectionMethod === "software") {
        datasetFile.dataset_file_instrument.software_name = group.softwareName || "";
      }
      if (group.collectionMethod === "other") {
        datasetFile.dataset_file_instrument.collection_method_other = group.collectionMethodOther || "";
      }
      if (group.recordedBy === "other") {
        datasetFile.dataset_file_instrument.recorded_by_other = group.recordedByOther || "";
      }
    }
    datasetFile.dataset_file_role = group.role || "";
    if (group.description) {
      datasetFile.dataset_file_description = group.description;
    }
    datasetFile.dataset_file_data_state = group.dataState || "";
    const hasDeviceMetadata = hasAnyValue([
      group.deviceId,
      group.deviceLocation,
      group.deviceLocationType,
    ]);
    if (fileGroupRequiresDevice(group) || (fileGroupAllowsDevice(group) && hasDeviceMetadata)) {
      datasetFile.dataset_file_crossref_device_id = group.deviceId || "";
      datasetFile.dataset_file_device_location = group.deviceLocation || "";
      datasetFile.dataset_file_device_location_type = group.deviceLocationType || "";
    }
    datasetFile.dataset_file_temporal_resolution = group.temporalResolutionType === "event_based"
      ? { resolution_type: "event_based" }
      : {
          resolution_type: "fixed_interval",
          value: group.samplingInterval === "" ? null : Number(group.samplingInterval),
          unit: group.temporalResolutionUnit || "",
        };
    datasetFile.dataset_file_instructions = group.instructions || "";
    datasetFile.dataset_file_datetime = GlcDatetimeMetadata.buildFileDatetimeFromGroup(
      group,
      suggestDatetimeColumn(group.columns),
    );
  }

  if (schemaVersion !== "3.0.2") {
    datasetFile.dataset_file_auxiliary = group.auxiliary === "" ? null : Boolean(group.auxiliary);
  }

  const primaryVariables = getPrimaryVariables(group);
  if (
    (schemaVersion === "3.0.2" && (group.role === "primary" || primaryVariables.length > 0))
    || (schemaVersion !== "3.0.2" && group.auxiliary !== true)
  ) {
    datasetFile.primary_variables = primaryVariables;
  }

  return datasetFile;
}

function buildDatasetRecordDraft(record) {
  const fileGroups = record.fileGroups?.length ? record.fileGroups : [createFileGroup()];
  const schemaVersion = fields.schemaVersion.value || "3.0.2";
  const datetimeGroup = fileGroups.find((group) => !group.auxiliary) || fileGroups[0];

  const datasetDatetime = {
    dataset_datetime_date: datetimeGroup.datetimeSource === "collection"
      ? datetimeGroup.collectionDatetime || ""
      : datetimeGroup.datetimeDate || suggestDatetimeColumn(datetimeGroup.columns),
    dataset_datetime_dateformat: datetimeGroup.datetimeDateformat || "",
    dataset_datetime_time: datetimeGroup.datetimeSource === "collection" ? null : datetimeGroup.datetimeTime || null,
    dataset_datetime_timeformat: datetimeGroup.datetimeSource === "collection"
      ? null
      : datetimeGroup.datetimeTime
        ? datetimeGroup.datetimeTimeformat || null
        : null,
  };

  const datasetRecord = {
    schema_version: schemaVersion,
    dataset_internal_id: record.datasetId || "",
    ...(schemaVersion === "3.0.2" ? {
      dataset_participant_associated: record.participantAssociated !== false,
    } : {}),
    dataset_crossref: {
      dataset_crossref_study_id: record.studyId || "",
      ...(schemaVersion === "3.0.2" && record.participantAssociated === false
        ? {}
        : { dataset_crossref_participant_id: record.participantId || "" }),
    },
    dataset_timezone: record.datasetTimezone || "",
    dataset_location: schemaVersion === "3.0.2"
      ? [
          record.latitude === "" ? null : Number(record.latitude),
          record.longitude === "" ? null : Number(record.longitude),
        ]
      : [record.latitude || "", record.longitude || ""],
    dataset_variable_terms: getDatasetVariableTerms(fileGroups),
    dataset_file: fileGroups.map((group) => buildDatasetFile(group, schemaVersion)),
  };

  if (schemaVersion !== "3.0.2") {
    datasetRecord.dataset_instructions = record.instructions || "";
    datasetRecord.dataset_crossref.dataset_crossref_device_id = record.deviceId || "";
    datasetRecord.dataset_device_location = record.deviceLocation || "";
    datasetRecord.dataset_sampling_interval = record.samplingInterval === "" ? null : Number(record.samplingInterval);
    datasetRecord.dataset_datetime = datasetDatetime;
  }

  return datasetRecord;
}

function buildDatasetDraft() {
  if (state.activeStep === "datasets") {
    syncActiveDatasetFromControls();
  }
  return omitEmptyOptionalEntities(state.datasets.map(buildDatasetRecordDraft), state.entitySchemas.dataset);
}

function getDatasetVariableTerms(fileGroups = state.fileGroups) {
  const byTerm = new Map();
  fileGroups.forEach((group) => {
    ensureOtherTerm(group);
    group.terms
      .filter((entry) => entry.term)
      .forEach((entry) => {
        if (!byTerm.has(entry.term)) {
          byTerm.set(entry.term, {
            term: entry.term,
            label: entry.label || null,
          });
        }
      });
  });
  return Array.from(byTerm.values());
}

function suggestDatetimeColumn(columns) {
  return (
    columns.find((column) => {
      const normalized = column.toLowerCase();
      return normalized.includes("timestamp") || normalized.includes("date/time") || normalized === "date";
    }) ||
    columns[0] ||
    ""
  );
}

function syncDatetimeControls() {
  const usesCollectionDate = fields.datetimeSource.value === "collection";
  fields.collectionDatetime.disabled = !usesCollectionDate;
  fields.datetimeDate.disabled = usesCollectionDate;
  fields.datetimeTime.disabled = usesCollectionDate;
  fields.datetimeTimeformat.disabled = usesCollectionDate || !fields.datetimeTime.value;
}

function buildStudyDraft() {
  const datasetIds = buildDatasetDraft().map((entry) => entry.dataset_internal_id).filter(Boolean);
  if (fields.studyDatasetsPreview) {
    fields.studyDatasetsPreview.value = datasetIds.join(", ");
  }
  return omitEmptyOptionalEntities([
    {
      schema_version: fields.schemaVersion.value || "3.0.2",
      study_internal_id: getStudyId(),
      study_title: fields.studyTitle.value || "",
      study_preregistration: fields.studyPreregistration.value || null,
      study_ethics: fields.studyEthics.value || null,
      study_registration: fields.studyRegistration.value || null,
      study_short_description: fields.studyShortDescription.value || "",
      study_sample: fields.studySample.value || "",
      study_groups: buildStudyGroups(),
      study_intervention: fields.studyIntervention.value || null,
      study_setting: fields.studySetting.value || "",
      study_geographical_location: fields.studyGeographicalLocation.value || "",
      study_contributors: buildContributors(),
      study_datasets: datasetIds,
      study_type: fields.studyType.value || null,
      study_funding_sources: splitList(fields.studyFundingSources.value),
      study_keywords: splitList(fields.studyKeywords.value),
    },
  ], state.entitySchemas.study);
}

function buildStudyGroups() {
  const validDatasetIds = new Set(getDatasetIdOptions());
  const groups = state.studyGroups
    .filter((entry) => entry.name || entry.description || entry.size || entry.inclusion || entry.exclusion || normalizeStringArray(entry.datasets).length)
    .map((entry) => ({
      study_group_name: entry.name,
      study_group_description: entry.description || null,
      study_group_size: entry.size === "" ? null : Number(entry.size),
      study_group_inclusion: splitSemicolonList(entry.inclusion),
      study_group_exclusion: splitSemicolonList(entry.exclusion),
      study_group_datasets: normalizeStringArray(entry.datasets).filter((datasetId) => validDatasetIds.has(datasetId)),
    }));
  return groups.length ? groups : null;
}

function buildContributors() {
  const contributors = state.contributors
    .filter((entry) => hasAnyValue([
      entry.fullName,
      entry.roles,
      entry.email,
      entry.orcid,
      entry.institutionName,
      entry.institutionCity,
      entry.institutionCountry,
    ]))
    .map((entry) => {
      const contributor = {
        contributor_full_name: entry.fullName,
      };
      const roles = splitSemicolonList(entry.roles);
      if (roles.length) contributor.contributor_roles = roles;
      if (entry.email) contributor.contributor_email = entry.email;
      if (entry.orcid) contributor.contributor_orcid = entry.orcid;
      if (entry.institutionName || entry.institutionCountry) {
        contributor.contributor_institution = {
          contributor_institution_name: entry.institutionName,
          contributor_institution_country: entry.institutionCountry,
        };
        if (entry.institutionCity) {
          contributor.contributor_institution.contributor_institution_city = entry.institutionCity;
        }
      }
      return contributor;
    });
  return contributors.length ? contributors : null;
}

function buildParticipantsRows() {
  return state.participants
    .filter((entry) => entry.id || entry.age || entry.sex || entry.gender)
    .map((entry) => ({
      participant_internal_id: entry.id,
      participant_age: entry.age === "" ? "" : Number(entry.age),
      participant_sex: entry.sex,
      participant_gender: entry.gender,
    }));
}

function buildCharacteristicsRows() {
  return state.characteristics
    .filter((entry) => entry.participantId || entry.name || entry.value || entry.unit || entry.description)
    .map((entry) => ({
      participant_internal_id: entry.participantId,
      participant_characteristic_name: entry.name,
      participant_characteristic_value: entry.value,
      participant_characteristic_unit: entry.unit,
      participant_characteristic_description: entry.description,
    }));
}

function buildDevicesDraft({ includeEmpty = false } = {}) {
  const devices = includeEmpty && state.devices.length === 0 ? [createDevice()] : state.devices;
  const rows = devices
    .filter((entry) => includeEmpty || entry.id || entry.manufacturer || entry.model || entry.serialNumber)
    .map((entry) => ({
      schema_version: fields.schemaVersion.value || "3.0.2",
      device_internal_id: entry.id,
      device_manufacturer: entry.manufacturer,
      device_model: entry.model,
      device_serial_number: entry.serialNumber,
      device_calibration_date: entry.calibrationDate,
      device_firmware_version: entry.firmwareVersion || null,
      device_datasheet_id: entry.datasheetId,
      device_sensors: parseDeviceSensors(entry.sensorsText),
    }));
  return omitEmptyOptionalEntities(rows, state.entitySchemas.device);
}

function buildDatasheetsDraft({ includeEmpty = false } = {}) {
  const datasheets = includeEmpty && state.datasheets.length === 0 ? [createDatasheet()] : state.datasheets;
  const schemaVersion = fields.schemaVersion.value || "3.0.2";
  const schema3 = String(schemaVersion).startsWith("3.");
  const rows = datasheets
    .filter((entry) => includeEmpty || entry.id || entry.manufacturer || entry.model)
    .map((entry) => {
      const base = {
        schema_version: schemaVersion,
        datasheet_id: entry.id,
        datasheet_version: entry.version || null,
        datasheet_manufacturer: entry.manufacturer,
        datasheet_type: entry.type,
        datasheet_model: entry.model,
        datasheet_calibration_interval: entry.calibrationInterval === "" ? null : Number(entry.calibrationInterval),
        datasheet_channel: parseChannels(entry.channelsText),
      };
      if (!schema3) {
        return {
          ...base,
          datasheet_calibration_spectral_sensitivity: parseSpectralSensitivity(entry.spectralSensitivityText),
          datasheet_calibration_linearity: entry.linearity,
          datasheet_calibration_directional_response: entry.directionalResponse,
          datasheet_calibration_range: entry.range,
        };
      }

      const modalities = normalizeStringArray(entry.modalities);
      const result = {
        ...base,
        datasheet_sensor_modality: modalities,
        datasheet_sensor_modality_other: modalities.includes("other") ? entry.modalityOther : null,
        datasheet_calibration_method: entry.calibrationMethod || null,
        datasheet_calibration_accuracy: entry.calibrationAccuracy || null,
        datasheet_calibration_notes: entry.calibrationNotes || null,
        datasheet_calibration_parameters: parseCalibrationParameters(entry.calibrationParametersText),
      };
      if (modalities.includes("light")) {
        result.datasheet_calibration_spectral_sensitivity = parseSpectralSensitivity(entry.spectralSensitivityText);
        result.datasheet_calibration_linearity = entry.linearity;
        result.datasheet_calibration_directional_response = entry.directionalResponse;
        result.datasheet_calibration_range = entry.range;
      }
      return result;
    });
  return omitEmptyOptionalEntities(rows, state.entitySchemas.datasheet);
}

function buildDataPackage() {
  const schemaVersion = fields.schemaVersion.value || "3.0.2";
  const schemaBase = `schemas/${schemaVersion}`;
  const includeCharacteristics = buildCharacteristicsRows().length > 0;
  const resources = [
    {
      name: "study",
      path: "data/study.json",
      profile: "json-entity-resource.json",
      mediatype: "application/json",
      jsonSchema: `${schemaBase}/study.schema.json`,
    },
    {
      name: "participants",
      path: "data/participants.csv",
      profile: "tabular-data-resource",
      format: "csv",
      mediatype: "text/csv",
      schema: `${schemaBase}/participants.schema.json`,
    },
    {
      name: "datasets",
      path: "data/datasets.json",
      profile: "json-entity-resource.json",
      mediatype: "application/json",
      jsonSchema: `${schemaBase}/dataset.schema.json`,
    },
    {
      name: "devices",
      path: "data/devices.json",
      profile: "json-entity-resource.json",
      mediatype: "application/json",
      jsonSchema: `${schemaBase}/device.schema.json`,
    },
    {
      name: "device_datasheets",
      path: "data/device_datasheet.json",
      profile: "json-entity-resource.json",
      mediatype: "application/json",
      jsonSchema: `${schemaBase}/device_datasheet.schema.json`,
    },
  ];

  if (includeCharacteristics) {
    resources.push({
      name: "participant_characteristics",
      path: "data/participant_characteristics.csv",
      profile: "tabular-data-resource",
      format: "csv",
      mediatype: "text/csv",
      schema: `${schemaBase}/participant_characteristics.schema.json`,
    });
  }

  return {
    profile: `${schemaBase}/${schemaVersion === "3.0.2" ? "glc-dp-profile.json" : "gleam-dp-profile.json"}`,
    schema_version: schemaVersion,
    name: fields.packageName.value,
    title: fields.packageTitle.value,
    resources,
  };
}

function parseDeviceSensors(text) {
  const sensors = text
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, datasheetId] = line.split("|").map((part) => part.trim());
      return {
        device_sensor_type: type,
        device_sensor_datasheet_id: datasheetId || null,
      };
    });
  return sensors.length ? sensors : null;
}

function parseSpectralSensitivity(text) {
  return text
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [wavelength, relative] = line.split(/[|,]/).map((part) => part.trim());
      return {
        datasheet_calibration_spectral_sensitivity_wavelength: Number(wavelength),
        datasheet_calibration_spectral_sensitivity_relative: Number(relative),
      };
    });
}

function parseChannels(text) {
  const channels = text
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [nr, name, unit, description] = line.split("|").map((part) => part.trim());
      return {
        datasheet_channel_nr: Number(nr),
        datasheet_channel_name: name,
        datasheet_channel_unit: unit || null,
        datasheet_channel_description: description || null,
      };
    });
  return channels.length ? channels : null;
}

function splitList(value) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function splitSemicolonList(value) {
  const items = value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

function buildParticipantsCsv() {
  return rowsToCsv([
    "participant_internal_id",
    "participant_age",
    "participant_sex",
    "participant_gender",
  ], buildParticipantsRows());
}

function buildCharacteristicsCsv() {
  return rowsToCsv([
    "participant_internal_id",
    "participant_characteristic_name",
    "participant_characteristic_value",
    "participant_characteristic_unit",
    "participant_characteristic_description",
  ], buildCharacteristicsRows());
}

function rowsToCsv(headers, rows) {
  return [headers.join(",")]
    .concat(rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")))
    .join("\n");
}

function csvEscape(value) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function getPreviewPayload() {
  if (state.activeStep === "start" || state.activeStep === "project" || state.activeStep === "export") return buildDataPackage();
  if (state.activeStep === "study") return buildStudyDraft();
  if (state.activeStep === "participants") {
    return {
      "participants.csv": buildParticipantsRows(),
      "participant_characteristics.csv": buildCharacteristicsRows(),
    };
  }
  if (state.activeStep === "devices") {
    return {
      "devices.json": buildDevicesDraft({ includeEmpty: true }),
      "device_datasheet.json": buildDatasheetsDraft({ includeEmpty: true }),
    };
  }
  if (state.activeStep === "datasheets") return buildDatasheetsDraft({ includeEmpty: true });
  return buildDatasetDraft();
}

function getPreviewTitle() {
  const titles = {
    start: "datapackage.json preview",
    project: "datapackage.json preview",
    study: "study.json preview",
    participants: "participant tables preview",
    devices: "device files preview",
    datasheets: "device_datasheet.json preview",
    datasets: "datasets.json preview",
    export: "datapackage.json preview",
  };
  return titles[state.activeStep] || "Package preview";
}

function updatePreview() {
  syncWorkspaceMode();
  refreshStudyGroupsForDatasetOptions();
  const payload = getPreviewPayload();
  previewTitle.textContent = getPreviewTitle();
  jsonPreview.textContent = JSON.stringify(payload, null, 2);
  schedulePreviewHeightSync();
  updatePackageSummary();
  const headerDraftButton = document.querySelector("#download-builder-project-header");
  const headerStartOverButton = document.querySelector("#start-over-header");
  const showDraftActions = state.activeStep !== "start" && builderHasMeaningfulContent();
  if (headerDraftButton) {
    headerDraftButton.hidden = !showDraftActions;
  }
  if (headerStartOverButton) {
    headerStartOverButton.hidden = !showDraftActions;
  }
  scheduleDraftAutosave();
}

function syncWorkspaceMode() {
  if (!workspace) return;
  workspace.classList.toggle("start-mode", state.activeStep === "start");
}

let previewHeightFrame = null;

function schedulePreviewHeightSync() {
  if (previewHeightFrame) {
    cancelAnimationFrame(previewHeightFrame);
  }
  previewHeightFrame = requestAnimationFrame(() => {
    previewHeightFrame = null;
    syncPreviewHeight();
  });
}

function syncPreviewHeight() {
  if (!builderPanel || !previewPanel || !jsonPreview) return;

  if (window.matchMedia("(max-width: 1100px)").matches) {
    previewPanel.style.removeProperty("height");
    jsonPreview.style.removeProperty("max-height");
    return;
  }

  const targetHeight = Math.max(640, builderPanel.offsetHeight);
  previewPanel.style.height = `${targetHeight}px`;
  jsonPreview.style.maxHeight = `${Math.max(320, targetHeight - 74)}px`;
}

function updatePackageSummary() {
  if (!packageSummary) return;
  packageSummary.className = "validation-summary ok";
  packageSummary.textContent = `${buildParticipantsRows().length} participant row(s), ${buildDevicesDraft().length} device record(s), ${buildDatasheetsDraft().length} datasheet record(s), ${buildDatasetDraft().length} dataset record(s).`;
  renderSectionValidationPanels();
  renderExportValidationPanel();
}

function validateBuilder() {
  return [
    ...validateStudyForExport(),
    ...validateParticipantsForExport(),
    ...validateDevicesForExport(),
    ...validateDatasheetsForExport(),
    ...validateDatasetsForExport(),
  ];
}

function validateSectionForExport(section) {
  if (section === "study") return validateStudyForExport();
  if (section === "participants") return validateParticipantsForExport();
  if (section === "devices") return [...validateDevicesForExport(), ...validateDatasheetsForExport()];
  if (section === "datasets") return validateDatasetsForExport();
  return [];
}

function renderSectionValidationPanels() {
  Object.entries(sectionValidationPanels).forEach(([section, panel]) => {
    if (!panel) {
      return;
    }
    renderValidationPanel(panel, validateSectionForExport(section), {
      okTitle: "No page warnings",
      okText: "This page has no missing required fields according to the builder checks.",
      warningText: "Soft warning only: downloads are still available, but these fields may fail the full validator.",
      titleSuffix: "warning(s) on this page",
      classBase: "section-validation-panel",
      hideWhenOk: true,
    });
  });
}

function renderValidationPanel(panel, issues, options) {
  const {
    okTitle,
    okText,
    warningText,
    titleSuffix,
    classBase,
    hideWhenOk = false,
  } = options;

  if (issues.length === 0) {
    if (hideWhenOk) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    panel.hidden = false;
    panel.className = `${classBase} ok`;
    panel.innerHTML = `
      <h3>${escapeHtml(okTitle)}</h3>
      <p>${escapeHtml(okText)}</p>
    `;
    return;
  }

  panel.hidden = false;
  const grouped = issues.reduce((bySection, issue) => {
    if (!bySection[issue.section]) {
      bySection[issue.section] = [];
    }
    bySection[issue.section].push(issue.message);
    return bySection;
  }, {});

  panel.className = `${classBase} warning`;
  panel.innerHTML = `
    <h3>${issues.length} ${escapeHtml(titleSuffix)}</h3>
    <p>${escapeHtml(warningText)}</p>
    ${Object.entries(grouped)
      .map(([section, messages]) => `
        <strong>${escapeHtml(section)}</strong>
        <ul>
          ${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}
        </ul>
      `)
      .join("")}
  `;
}

function validationIssue(section, message) {
  return { section, message };
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function schemaPattern(property) {
  if (!property || typeof property !== "object") return "";
  if (property.pattern) return property.pattern;
  for (const alternative of [...(property.oneOf || []), ...(property.anyOf || [])]) {
    const pattern = schemaPattern(alternative);
    if (pattern) return pattern;
  }
  return "";
}

function matchesSchemaPattern(value, property) {
  const pattern = schemaPattern(property);
  return !pattern || new RegExp(pattern).test(String(value || ""));
}

function hasAnyValue(values) {
  return values.some((value) => !isBlank(value));
}

function isFiniteNumberValue(value) {
  return !isBlank(value) && Number.isFinite(Number(value));
}

function studyHasUserContent() {
  const studyFieldValues = [
    fields.studyInternalId.value,
    fields.studyTitle.value,
    fields.studyPreregistration.value,
    fields.studyRegistration.value,
    fields.studyEthics.value,
    fields.studyType.value,
    fields.studyShortDescription.value,
    fields.studySample.value,
    fields.studySetting.value,
    fields.studyGeographicalLocation.value,
    fields.studyIntervention.value,
    fields.studyFundingSources.value,
    fields.studyKeywords.value,
  ];
  const hasStudyGroupContent = state.studyGroups.some((group) => hasAnyValue([
    group.name,
    group.description,
    group.size,
    group.inclusion,
    group.exclusion,
    ...normalizeStringArray(group.datasets),
  ]));
  const hasContributorContent = state.contributors.some((contributor) => hasAnyValue([
    contributor.fullName,
    contributor.roles,
    contributor.email,
    contributor.orcid,
    contributor.institutionName,
    contributor.institutionCity,
    contributor.institutionCountry,
  ]));

  return hasAnyValue(studyFieldValues) || hasStudyGroupContent || hasContributorContent;
}

function fileGroupHasUserContent(group) {
  return hasAnyValue([
    ...(group.files || []).map((file) => file?.name || file),
    ...(group.columns || []).map((column) => column?.name || column),
    ...(group.modalities || []),
    group.modalityOther,
    group.modalityOtherType,
    group.instrumentType,
    group.instrumentName,
    group.collectionMethod,
    group.softwareName,
    group.collectionMethodOther,
    group.recordedBy,
    group.recordedByOther,
    group.description,
    group.deviceId,
    group.deviceLocation,
    group.deviceLocationType,
    group.samplingInterval,
    group.temporalResolutionUnit,
    group.instructions,
    group.headerRow,
    group.fileFormat,
    group.encoding,
    group.fileTimezone,
    group.auxiliary,
    group.role,
    group.dataState,
    group.preprocessingBol,
    group.preprocessingDesc,
    group.collectionDatetime,
    group.datetimeDate,
    group.datetimeDateformat,
    group.datetimeTime,
    group.datetimeTimeformat,
  ]);
}

function datasetHasUserContent(dataset) {
  return hasAnyValue([
    dataset.datasetId,
    dataset.studyId,
    dataset.participantId,
    dataset.deviceId,
    dataset.deviceLocation,
    dataset.samplingInterval,
    dataset.datasetTimezone,
    dataset.latitude,
    dataset.longitude,
    dataset.instructions,
  ]) || (dataset.fileGroups || []).some(fileGroupHasUserContent);
}

function normalizeTimeZoneValue(value) {
  return String(value || "").trim();
}

function isRecognizedTimeZone(value) {
  const timeZone = normalizeTimeZoneValue(value);
  if (!timeZone) {
    return true;
  }
  if (state.supportedTimeZoneSet.has(timeZone)) {
    return true;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function suggestTimeZone(value) {
  const timeZone = normalizeTimeZoneValue(value);
  if (!timeZone || state.supportedTimeZones.length === 0) {
    return "";
  }

  const caseInsensitiveMatch = state.supportedTimeZones.find((entry) => entry.toLowerCase() === timeZone.toLowerCase());
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  let best = { value: "", distance: Infinity };
  state.supportedTimeZones.forEach((entry) => {
    const distance = levenshteinDistance(timeZone.toLowerCase(), entry.toLowerCase());
    if (distance < best.distance) {
      best = { value: entry, distance };
    }
  });

  const threshold = Math.max(2, Math.floor(timeZone.length * 0.22));
  return best.distance <= threshold ? best.value : "";
}

function levenshteinDistance(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function timeZoneIssueMessage(label, value) {
  const suggestion = suggestTimeZone(value);
  return suggestion
    ? `${label} "${normalizeTimeZoneValue(value)}" is not a recognized IANA time zone. Did you mean "${suggestion}"?`
    : `${label} "${normalizeTimeZoneValue(value)}" is not a recognized IANA time zone. Use a tz database name such as "Europe/Berlin".`;
}

function validateStudyForExport() {
  const issues = [];
  const contributorRequired = new Set(state.entitySchemas.contributor?.required || []);
  const institutionRequired = new Set(
    state.entitySchemas.contributor?.properties?.contributor_institution?.required || []
  );
  if (!studyHasUserContent()) {
    return [validationIssue("Study", "Study resource is missing. Complete the Study page.")];
  }

  const datasetIds = buildDatasetDraft().map((entry) => entry.dataset_internal_id).filter(Boolean);
  const datasetIdSet = new Set(datasetIds);
  const studyGroupDatasetAssignments = new Map();
  [
    [getStudyId(), "Study internal ID is missing."],
    [fields.studyTitle.value, "Study title is missing."],
    [fields.studyShortDescription.value, "Study short description is missing."],
    [fields.studySample.value, "Study sample is missing."],
    [fields.studySetting.value, "Study setting is missing."],
    [fields.studyGeographicalLocation.value, "Study geographical location is missing."],
    [datasetIds.join(","), "Study datasets is missing. Add at least one dataset record on the Datasets page."],
  ].forEach(([value, message]) => {
    if (isBlank(value)) {
      issues.push(validationIssue("Study", message));
    }
  });
  state.studyGroups
    .filter((entry) => entry.name || entry.description || entry.size || entry.inclusion || entry.exclusion || normalizeStringArray(entry.datasets).length)
    .forEach((group, index) => {
      const label = group.name || `study group ${index + 1}`;
      const selectedDatasetIds = normalizeStringArray(group.datasets);
      if (isBlank(group.name)) {
        issues.push(validationIssue("Study", `Study group ${label}: group name is required.`));
      }
      if (selectedDatasetIds.length === 0) {
        issues.push(validationIssue("Study", `Study group ${label}: at least one linked dataset is required.`));
      }
      if (!isBlank(group.size) && (!Number.isInteger(Number(group.size)) || Number(group.size) < 0)) {
        issues.push(validationIssue("Study", `Study group ${label}: size must be a non-negative integer.`));
      }
      selectedDatasetIds
        .filter((datasetId) => !datasetIdSet.has(datasetId))
        .forEach((datasetId) => {
          issues.push(validationIssue("Study", `Study group ${label}: linked dataset "${datasetId}" does not exist in datasets.json.`));
        });
      selectedDatasetIds.forEach((datasetId) => {
        const previousAssignment = studyGroupDatasetAssignments.get(datasetId);
        if (previousAssignment && previousAssignment.index !== index) {
          issues.push(validationIssue(
            "Study",
            `Dataset "${datasetId}" is assigned to multiple study groups: "${previousAssignment.label}" and "${label}".`,
          ));
        } else if (!previousAssignment) {
          studyGroupDatasetAssignments.set(datasetId, { index, label });
        }
      });
    });
  state.contributors
    .filter((entry) => hasAnyValue([
      entry.fullName,
      entry.roles,
      entry.email,
      entry.orcid,
      entry.institutionName,
      entry.institutionCity,
      entry.institutionCountry,
    ]))
    .forEach((contributor, index) => {
      const label = contributor.fullName || `row ${index + 1}`;
      if (contributorRequired.has("contributor_full_name") && isBlank(contributor.fullName)) {
        issues.push(validationIssue("Study", `Contributor ${label}: full name is missing.`));
      }
      if (contributorRequired.has("contributor_orcid") && isBlank(contributor.orcid)) {
        issues.push(validationIssue("Study", `Contributor ${label}: ORCID is missing.`));
      }
      if (!isBlank(contributor.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contributor.email)) {
        issues.push(validationIssue("Study", `Contributor ${label}: email address is not valid.`));
      }
      const institutionStarted = hasAnyValue([
        contributor.institutionName,
        contributor.institutionCity,
        contributor.institutionCountry,
      ]);
      if (institutionStarted
        && institutionRequired.has("contributor_institution_name")
        && isBlank(contributor.institutionName)) {
        issues.push(validationIssue("Study", `Contributor ${label}: institution name is missing.`));
      }
      if (institutionStarted
        && institutionRequired.has("contributor_institution_country")
        && isBlank(contributor.institutionCountry)) {
        issues.push(validationIssue("Study", `Contributor ${label}: institution country is missing.`));
      }
    });
  return issues;
}

function validateParticipantsForExport() {
  const issues = [];
  const participantIds = new Set();
  const characteristicKeys = new Set();
  const participants = state.participants.filter((entry) => hasAnyValue([entry.id, entry.age, entry.sex, entry.gender]));

  if (participants.length === 0) {
    return [validationIssue("Participants", "Participants resource is missing. Complete the Participants page.")];
  }

  participants.forEach((participant, index) => {
    const label = participant.id || `row ${index + 1}`;
    if (isBlank(participant.id)) {
      issues.push(validationIssue("Participants", `Participant ${label}: participant ID is missing.`));
    }
    if (isBlank(participant.age)) {
      issues.push(validationIssue("Participants", `Participant ${label}: age is missing.`));
    } else if (!Number.isInteger(Number(participant.age)) || Number(participant.age) < 0 || Number(participant.age) > 120) {
      issues.push(validationIssue("Participants", `Participant ${label}: age must be an integer from 0 to 120.`));
    }
    if (!isBlank(participant.id)) {
      if (participantIds.has(participant.id)) {
        issues.push(validationIssue("Participants", `Participant ${label}: participant ID is duplicated.`));
      }
      participantIds.add(participant.id);
    }
  });

  state.characteristics
    .filter((entry) => hasAnyValue([
      entry.participantId,
      entry.name,
      entry.value,
      entry.unit,
      entry.description,
    ]))
    .forEach((characteristic, index) => {
      const label = characteristic.name || `row ${index + 1}`;
      if (isBlank(characteristic.participantId)) {
        issues.push(validationIssue("Participants", `Characteristic ${label}: participant ID is missing.`));
      } else if (!participantIds.has(characteristic.participantId)) {
        issues.push(validationIssue("Participants", `Characteristic ${label}: participant ID does not match a participant row.`));
      }
      if (isBlank(characteristic.name)) {
        issues.push(validationIssue("Participants", `Characteristic ${label}: characteristic name is missing.`));
      }
      if (!isBlank(characteristic.participantId) && !isBlank(characteristic.name)) {
        const key = `${characteristic.participantId}\u001f${characteristic.name}`;
        if (characteristicKeys.has(key)) {
          issues.push(validationIssue("Participants", `Characteristic ${label}: participant and characteristic name combination is duplicated.`));
        }
        characteristicKeys.add(key);
      }
    });

  return issues;
}

function validateDevicesForExport() {
  const issues = [];
  const deviceIds = new Set();
  const datasheetIds = new Set(getDatasheetIds());
  const datasheetIdProperty = state.entitySchemas.device?.properties?.device_datasheet_id;
  const sensorDatasheetIdProperty = state.entitySchemas.device?.properties
    ?.device_sensors?.items?.properties?.device_sensor_datasheet_id;
  const calibrationDateProperty = state.entitySchemas.device?.properties?.device_calibration_date;
  const devices = state.devices.filter((entry) => hasAnyValue([
    entry.id,
    entry.manufacturer,
    entry.model,
    entry.serialNumber,
    entry.calibrationDate,
    entry.datasheetId,
    entry.sensorsText,
  ]));

  if (devices.length === 0) {
    return [validationIssue("Devices", "Devices resource is missing. Complete the Devices page.")];
  }

  devices.forEach((device, index) => {
    const label = device.id || `row ${index + 1}`;
    [
      [device.id, "device ID"],
      [device.manufacturer, "manufacturer"],
      [device.model, "model"],
      [device.serialNumber, "serial number"],
      [device.calibrationDate, "calibration date"],
      [device.datasheetId, "datasheet ID"],
    ].forEach(([value, fieldName]) => {
      if (isBlank(value)) {
        issues.push(validationIssue("Devices", `Device ${label}: ${fieldName} is missing.`));
      }
    });
    if (!isBlank(device.id)) {
      if (deviceIds.has(device.id)) {
        issues.push(validationIssue("Devices", `Device ${label}: device ID is duplicated.`));
      }
      deviceIds.add(device.id);
    }
    if (!isBlank(device.calibrationDate)
      && !matchesSchemaPattern(device.calibrationDate, calibrationDateProperty)) {
      issues.push(validationIssue("Devices", `Device ${label}: calibration date must use YYYY-MM-DD.`));
    }
    if (!isBlank(device.datasheetId)
      && !matchesSchemaPattern(device.datasheetId, datasheetIdProperty)) {
      issues.push(validationIssue("Devices", `Device ${label}: datasheet ID does not match the schema’s slug format.`));
    }
    if (!isBlank(device.datasheetId) && !datasheetIds.has(device.datasheetId)) {
      issues.push(validationIssue("Devices", `Device ${label}: datasheet ID does not match a device-datasheet record.`));
    }

    const sensors = parseDeviceSensors(device.sensorsText || "");
    (sensors || []).forEach((sensor, sensorIndex) => {
      if (isBlank(sensor.device_sensor_type)) {
        issues.push(validationIssue("Devices", `Device ${label}, sensor ${sensorIndex + 1}: sensor type is missing.`));
      }
      if (!isBlank(sensor.device_sensor_datasheet_id)
        && !matchesSchemaPattern(sensor.device_sensor_datasheet_id, sensorDatasheetIdProperty)) {
        issues.push(validationIssue("Devices", `Device ${label}, sensor ${sensorIndex + 1}: sensor datasheet ID does not match the schema’s slug format.`));
      }
      if (!isBlank(sensor.device_sensor_datasheet_id)
        && !datasheetIds.has(sensor.device_sensor_datasheet_id)) {
        issues.push(validationIssue("Devices", `Device ${label}, sensor ${sensorIndex + 1}: sensor datasheet ID does not match a separate datasheet record.`));
      }
    });
  });

  return issues;
}

function validateDatasheetsForExport() {
  const issues = [];
  const schema3 = String(fields.schemaVersion.value || "3.0.2").startsWith("3.");
  const datasheetIds = new Set();
  const datasheetIdProperty = state.entitySchemas.datasheet?.properties?.datasheet_id;
  const datasheets = state.datasheets.filter((entry) => hasAnyValue([
    entry.id,
    entry.manufacturer,
    entry.type,
    normalizeStringArray(entry.modalities).join(""),
    entry.modalityOther,
    entry.model,
    entry.calibrationInterval,
    entry.spectralSensitivityText,
    entry.linearity,
    entry.directionalResponse,
    entry.range,
    entry.calibrationParametersText,
    entry.channelsText,
  ]));

  if (datasheets.length === 0) {
    return [validationIssue("Datasheets", "Device datasheets resource is missing. Complete the Datasheets page.")];
  }

  datasheets.forEach((datasheet, index) => {
    const label = datasheet.id || `row ${index + 1}`;
    [
      [datasheet.id, "datasheet ID"],
      [datasheet.manufacturer, "manufacturer"],
      [datasheet.type, "type"],
      [datasheet.model, "model"],
      ...(!schema3 ? [[datasheet.calibrationInterval, "calibration interval"]] : []),
    ].forEach(([value, fieldName]) => {
      if (isBlank(value)) {
        issues.push(validationIssue("Datasheets", `Datasheet ${label}: ${fieldName} is missing.`));
      }
    });
    if (!isBlank(datasheet.id)) {
      if (datasheetIds.has(datasheet.id)) {
        issues.push(validationIssue("Datasheets", `Datasheet ${label}: datasheet ID is duplicated.`));
      }
      datasheetIds.add(datasheet.id);
      if (!matchesSchemaPattern(datasheet.id, datasheetIdProperty)) {
        issues.push(validationIssue("Datasheets", `Datasheet ${label}: datasheet ID does not match the schema’s slug format.`));
      }
    }
    if (!isBlank(datasheet.calibrationInterval)
      && (!Number.isInteger(Number(datasheet.calibrationInterval)) || Number(datasheet.calibrationInterval) < 0)) {
      issues.push(validationIssue("Datasheets", `Datasheet ${label}: calibration interval must be a non-negative integer.`));
    }

    const modalities = normalizeStringArray(datasheet.modalities);
    if (schema3 && modalities.length === 0) {
      issues.push(validationIssue("Datasheets", `Datasheet ${label}: at least one sensor modality is missing.`));
    }
    if (schema3 && modalities.includes("other") && isBlank(datasheet.modalityOther)) {
      issues.push(validationIssue("Datasheets", `Datasheet ${label}: other modality description is missing.`));
    }
    const includesLight = modalities.includes("light");
    if (!schema3) {
      [
        [datasheet.linearity, "linearity"],
        [datasheet.directionalResponse, "directional response"],
        [datasheet.range, "calibration range"],
      ].forEach(([value, fieldName]) => {
        if (isBlank(value)) {
          issues.push(validationIssue("Datasheets", `Datasheet ${label}: ${fieldName} is missing.`));
        }
      });
    }
    if (schema3 && includesLight && isBlank(datasheet.range)) {
      issues.push(validationIssue("Datasheets", `Datasheet ${label}: calibration range is missing.`));
    }

    const spectralRows = parseSpectralSensitivity(datasheet.spectralSensitivityText || "");
    if (!schema3 && spectralRows.length === 0) {
      issues.push(validationIssue("Datasheets", `Datasheet ${label}: spectral sensitivity rows are missing.`));
    }
    spectralRows.forEach((row, rowIndex) => {
      if (Number.isNaN(row.datasheet_calibration_spectral_sensitivity_wavelength) || Number.isNaN(row.datasheet_calibration_spectral_sensitivity_relative)) {
        issues.push(validationIssue("Datasheets", `Datasheet ${label}, spectral row ${rowIndex + 1}: wavelength and relative sensitivity must be numeric.`));
      } else if (row.datasheet_calibration_spectral_sensitivity_wavelength < 0) {
        issues.push(validationIssue("Datasheets", `Datasheet ${label}, spectral row ${rowIndex + 1}: wavelength must be non-negative.`));
      }
    });

    if (schema3) {
      (parseCalibrationParameters(datasheet.calibrationParametersText) || []).forEach((parameter, parameterIndex) => {
        if (isBlank(parameter.parameter_name) || isBlank(parameter.parameter_value)) {
          issues.push(validationIssue("Datasheets", `Datasheet ${label}, calibration parameter ${parameterIndex + 1}: name and value are required.`));
        }
      });
    }

    const channels = parseChannels(datasheet.channelsText || "");
    if (schema3 && (!channels || channels.length === 0)) {
      issues.push(validationIssue("Datasheets", `Datasheet ${label}: at least one channel is missing.`));
    }
    (channels || []).forEach((channel, channelIndex) => {
      if (!Number.isInteger(channel.datasheet_channel_nr) || channel.datasheet_channel_nr < 1) {
        issues.push(validationIssue("Datasheets", `Datasheet ${label}, channel ${channelIndex + 1}: channel number must be an integer of 1 or greater.`));
      }
      if (isBlank(channel.datasheet_channel_name)) {
        issues.push(validationIssue("Datasheets", `Datasheet ${label}, channel ${channelIndex + 1}: channel name is missing.`));
      }
    });
  });

  return issues;
}

function validateDatasetsForExport() {
  const issues = [];

  if (state.activeStep === "datasets") {
    syncActiveDatasetFromControls();
  }

  const participantIds = new Set(getParticipantIds());
  const referencedParticipantIds = new Set();
  const deviceIds = new Set(getDeviceIds());
  const studyId = getStudyId();
  const datasetIds = new Set();
  const schemaVersion = fields.schemaVersion.value || "3.0.2";

  const datasetsWithContent = state.datasets.filter(datasetHasUserContent);
  if (datasetsWithContent.length === 0) {
    return [validationIssue("Datasets", "Datasets resource is missing. Complete the Datasets page.")];
  }

  datasetsWithContent.forEach((dataset, datasetIndex) => {
    const label = dataset.datasetId || `record ${datasetIndex + 1}`;

    [
      [dataset.datasetId, "dataset ID"],
      [dataset.studyId, "study ID"],
      ...(schemaVersion !== "3.0.2" || dataset.participantAssociated !== false
        ? [[dataset.participantId, "participant ID"]]
        : []),
      [dataset.datasetTimezone, "dataset timezone"],
      [dataset.latitude, "dataset location latitude"],
      [dataset.longitude, "dataset location longitude"],
      ...(schemaVersion === "3.0.2" ? [] : [
        [dataset.deviceId, "device ID"],
        [dataset.deviceLocation, "device location"],
        [dataset.samplingInterval, "sampling interval"],
        [dataset.instructions, "dataset instructions"],
      ]),
    ].forEach(([value, fieldName]) => {
      if (isBlank(value)) {
        issues.push(validationIssue("Datasets", `Dataset ${label}: ${fieldName} is missing.`));
      }
    });

    if (!isBlank(dataset.datasetId)) {
      if (datasetIds.has(dataset.datasetId)) {
        issues.push(validationIssue("Datasets", `Dataset ${label}: dataset ID is duplicated.`));
      }
      datasetIds.add(dataset.datasetId);
    }

    if (!isBlank(dataset.studyId) && studyId && dataset.studyId !== studyId) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: study ID does not match the Study page ID.`));
    }
    if (!isBlank(dataset.datasetTimezone) && !isRecognizedTimeZone(dataset.datasetTimezone)) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: ${timeZoneIssueMessage("dataset timezone", dataset.datasetTimezone)}`));
    }
    if (schemaVersion === "3.0.2" && !isBlank(dataset.latitude) && !isFiniteNumberValue(dataset.latitude)) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: dataset location latitude must be numeric.`));
    }
    if (schemaVersion === "3.0.2" && !isBlank(dataset.longitude) && !isFiniteNumberValue(dataset.longitude)) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: dataset location longitude must be numeric.`));
    }
    if (!isBlank(dataset.participantId) && !participantIds.has(dataset.participantId)) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: participant ID does not match any participant row.`));
    }
    if (schemaVersion === "3.0.2" && dataset.participantAssociated === false && !isBlank(dataset.participantId)) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: participant ID must be empty when no participant is associated.`));
    }
    if (!isBlank(dataset.participantId)) {
      referencedParticipantIds.add(dataset.participantId);
    }
    if (schemaVersion !== "3.0.2" && !isBlank(dataset.deviceId) && !deviceIds.has(dataset.deviceId)) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: device ID does not match any device record.`));
    }
    if (schemaVersion !== "3.0.2"
      && !isBlank(dataset.samplingInterval)
      && (!isFiniteNumberValue(dataset.samplingInterval) || Number(dataset.samplingInterval) < 0)) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: sampling interval must be a non-negative number.`));
    }

    const fileGroups = dataset.fileGroups || [];
    if (fileGroups.length === 0) {
      issues.push(validationIssue("Datasets", `Dataset ${label}: at least one file group is missing.`));
      return;
    }

    fileGroups.forEach((group, groupIndex) => {
      const groupLabel = `Dataset ${label}, file group ${groupIndex + 1}`;
      [
        ...(schemaVersion === "3.0.2" ? [
          [group.modalities?.length ? group.modalities : "", "file modality"],
          ...(fileGroupRequiresDevice(group) ? [
            [group.deviceId, "device ID"],
            [group.deviceLocation, "device location"],
            [group.deviceLocationType, "device location type"],
          ] : []),
          [group.temporalResolutionType, "temporal resolution type"],
          [group.instructions, "instructions"],
        ] : []),
        [group.fileFormat, "file format"],
        [group.encoding, "encoding"],
        [group.fileTimezone, "file timezone"],
        ...(schemaVersion === "3.0.2" ? [
          [group.role, "file role"],
          [group.dataState, "data state"],
        ] : [[group.auxiliary, "auxiliary file status"]]),
        [group.datetimeSource, "datetime source"],
        [group.datetimeDateformat, "date/datetime format"],
      ].forEach(([value, fieldName]) => {
        if (isBlank(value)) {
          issues.push(validationIssue("Datasets", `${groupLabel}: ${fieldName} is missing.`));
        }
      });

      if (schemaVersion === "3.0.2" && !isBlank(group.deviceId) && !deviceIds.has(group.deviceId)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: device ID does not match any device record.`));
      }
      if (schemaVersion === "3.0.2") {
        const modalities = group.modalities || [];
        if (dataset.participantAssociated === false
          && ["body_worn", "participant_proximal"].includes(group.deviceLocationType)) {
          issues.push(validationIssue("Datasets", `${groupLabel}: body-worn and near-participant device locations require a participant-associated dataset.`));
        }
        if (modalities.some((modality) => FILE_SENSOR_MODALITIES.has(modality))
          && modalities.some((modality) => FILE_NON_DEVICE_MODALITIES.has(modality))) {
          issues.push(validationIssue("Datasets", `${groupLabel}: sensor and non-device modalities must be placed in separate file groups.`));
        }
        if (modalities.includes("other")) {
          if (isBlank(group.modalityOther)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: other modality description is missing.`));
          }
          if (isBlank(group.modalityOtherType)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: other modality type is missing.`));
          }
          if (group.modalityOtherType === "sensor"
            && modalities.some((modality) => FILE_NON_DEVICE_MODALITIES.has(modality))) {
            issues.push(validationIssue("Datasets", `${groupLabel}: sensor-type other cannot be combined with non-device modalities.`));
          }
          if (group.modalityOtherType === "non_device"
            && modalities.some((modality) => FILE_SENSOR_MODALITIES.has(modality))) {
            issues.push(validationIssue("Datasets", `${groupLabel}: non-device other cannot be combined with sensor modalities.`));
          }
        }
        const instrumentType = modalities.find((modality) => FILE_NON_DEVICE_MODALITIES.has(modality));
        if (instrumentType) {
          if (isBlank(group.instrumentName)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: instrument name is missing.`));
          }
          if (isBlank(group.collectionMethod)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: collection method is missing.`));
          }
          if (group.collectionMethod === "software" && isBlank(group.softwareName)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: software name is missing.`));
          }
          if (group.collectionMethod === "other" && isBlank(group.collectionMethodOther)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: other collection method description is missing.`));
          }
          if (isBlank(group.recordedBy)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: recorded by is missing.`));
          }
          if (group.recordedBy === "other" && isBlank(group.recordedByOther)) {
            issues.push(validationIssue("Datasets", `${groupLabel}: other recorder description is missing.`));
          }
        }
        const optionalDeviceGroup = modalities.some((modality) => ["questionnaire", "diary"].includes(modality));
        const suppliedDeviceValues = [group.deviceId, group.deviceLocation, group.deviceLocationType];
        if (optionalDeviceGroup && suppliedDeviceValues.some((value) => !isBlank(value))
          && suppliedDeviceValues.some(isBlank)) {
          issues.push(validationIssue("Datasets", `${groupLabel}: optional device metadata must include device ID, location, and location type as a complete set.`));
        }
      }
      if (schemaVersion === "3.0.2" && group.temporalResolutionType === "fixed_interval") {
        if (isBlank(group.samplingInterval) || !isFiniteNumberValue(group.samplingInterval) || Number(group.samplingInterval) <= 0) {
          issues.push(validationIssue("Datasets", `${groupLabel}: temporal resolution value must be a positive number.`));
        }
        if (isBlank(group.temporalResolutionUnit)) {
          issues.push(validationIssue("Datasets", `${groupLabel}: temporal resolution unit is missing.`));
        }
      }

      if (!group.files || group.files.length === 0) {
        issues.push(validationIssue("Datasets", `${groupLabel}: no data file has been selected or listed.`));
      }
      if (!isBlank(group.headerRow)
        && (!Number.isInteger(Number(group.headerRow)) || Number(group.headerRow) < 1)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: header row must be an integer of 1 or greater.`));
      }
      if (!isBlank(group.fileTimezone) && !isRecognizedTimeZone(group.fileTimezone)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: ${timeZoneIssueMessage("file timezone", group.fileTimezone)}`));
      }
      if (!group.columns || group.columns.length === 0) {
        issues.push(validationIssue("Datasets", `${groupLabel}: no variables/columns are listed.`));
      }
      if (schemaVersion === "3.0.2") {
        (group.columns || []).forEach((column) => {
          const variable = group.variableState?.[column] || {};
          if (isBlank(variable.type)) {
            issues.push(validationIssue("Datasets", `${groupLabel}, variable ${column}: type is missing.`));
            return;
          }
          const quantitative = ["numeric", "integer"].includes(variable.type);
          if (quantitative && isBlank(variable.unit)) {
            issues.push(validationIssue("Datasets", `${groupLabel}, variable ${column}: unit is required for numeric and integer variables.`));
          }
          if (quantitative && ["n/a", "na", "unknown"].includes(String(variable.unit || "").trim().toLowerCase())) {
            issues.push(validationIssue("Datasets", `${groupLabel}, variable ${column}: replace the placeholder unit with a UCUM code or a precise custom unit.`));
          }
          if (variable.type === "factor") {
            const levels = parseFactorLevels(variable.factorLevelsText);
            if (levels.length === 0) {
              issues.push(validationIssue("Datasets", `${groupLabel}, variable ${column}: at least one factor level is required.`));
              return;
            }
            if (levels.some((level) => isBlank(level.value) || isBlank(level.label))) {
              issues.push(validationIssue("Datasets", `${groupLabel}, variable ${column}: every factor level requires a value and label.`));
            }
            const values = levels.map((level) => level.value);
            if (new Set(values).size !== values.length) {
              issues.push(validationIssue("Datasets", `${groupLabel}, variable ${column}: factor level values must be unique.`));
            }
          }
        });
      }
      if (group.datetimeSource === "column" && isBlank(group.datetimeDate)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: date or datetime column is missing.`));
      }
      if (group.datetimeSource === "collection" && isBlank(group.collectionDatetime)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: collection date/time value is missing.`));
      }
      if (group.datetimeTime && isBlank(group.datetimeTimeformat)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: time format is missing for the separate time column.`));
      }
      if (schemaVersion === "3.0.2" && group.dataState === "processed" && isBlank(group.preprocessingDesc)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: preprocessing/provenance description is missing for processed data.`));
      }
      if (schemaVersion !== "3.0.2" && group.preprocessingBol === true && isBlank(group.preprocessingDesc)) {
        issues.push(validationIssue("Datasets", `${groupLabel}: preprocessing description is missing.`));
      }
      if (schemaVersion === "3.0.2" && group.role === "primary" && getPrimaryVariables(group).length === 0) {
        issues.push(validationIssue("Datasets", `${groupLabel}: select at least one primary variable. A primary variable is a principal or default variable used to analyse this file group.`));
      }
      if (getPrimaryVariables(group).length > 4) {
        issues.push(validationIssue("Datasets", `${groupLabel}: no more than four primary variables are allowed.`));
      }
      if (schemaVersion !== "3.0.2" && group.auxiliary !== true && getPrimaryVariables(group).length === 0) {
        issues.push(validationIssue("Datasets", `${groupLabel}: at least one primary variable should be selected.`));
      }
    });
  });

  const unreferencedParticipantIds = Array.from(participantIds)
    .filter((participantId) => !referencedParticipantIds.has(participantId))
    .sort();
  if (unreferencedParticipantIds.length > 0) {
    const participantLabel = unreferencedParticipantIds.length === 1
      ? "participant ID is"
      : "participant IDs are";
    issues.push(validationIssue(
      "Participants",
      `${unreferencedParticipantIds.length} declared ${participantLabel} not referenced by any dataset: ${unreferencedParticipantIds.join(", ")}.`,
    ));
  }

  return issues;
}

function renderExportValidationPanel() {
  if (!exportValidationPanel) {
    return;
  }

  renderValidationPanel(exportValidationPanel, validateBuilder(), {
    okTitle: "Ready to export",
    okText: "No missing required fields were found by the builder checks.",
    warningText: "Soft warning only: downloads are still available, but these fields may fail the full validator.",
    titleSuffix: "issue(s) to review before export",
    classBase: "export-validation-panel",
  });
}

function handlePackageFolderSelection(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    hideImportFile(packageFolderImportFile);
    packageFolderImportSummary.textContent = "Choose a metadata package folder first, then click Import.";
    packageFolderImportSummary.className = "import-summary";
    return;
  }

  const folderName = getFolderSelectionName(files);
  showSelectedFile(packageFolderImportFile, `${folderName} (${files.length} file(s))`);
  packageFolderImportSummary.textContent = "Folder selected. Click Import selected metadata folder to load recognized metadata files.";
  packageFolderImportSummary.className = "import-summary";
}

async function importPackageFolder(files) {
  packageFolderImportSummary.textContent = `Scanning ${files.length} file(s)...`;
  packageFolderImportSummary.className = "import-summary";

  try {
    const found = findPackageMetadataFiles(files);
    const imported = [];
    const missing = [];

    if (found.datapackage) {
      const datapackage = JSON.parse(await found.datapackage.text());
      populatePackageFieldsFromDataPackage(datapackage);
      imported.push("datapackage.json");
    }

    if (found.study) {
      const studyText = await found.study.text();
      const parsed = JSON.parse(studyText);
      populateStudyFromSchema(Array.isArray(parsed) ? parsed[0] : parsed);
      imported.push("study.json");
    } else {
      missing.push("study.json");
    }

    if (found.participants) {
      state.participants = await parsePackageRows(found.participants, participantsFromJson, participantsFromTable);
      imported.push(found.participants.name);
    } else {
      missing.push("participants.csv");
    }

    if (found.characteristics) {
      state.characteristics = await parsePackageRows(found.characteristics, characteristicsFromJson, characteristicsFromTable);
      imported.push(found.characteristics.name);
    } else {
      state.characteristics = [];
    }

    if (found.devices) {
      state.devices = devicesFromJson(await found.devices.text());
      imported.push("devices.json");
    } else {
      missing.push("devices.json");
    }

    if (found.datasheets) {
      state.datasheets = datasheetsFromJson(await found.datasheets.text());
      state.datasheetImportedFiles = [found.datasheets.name];
      imported.push("device_datasheet.json");
    } else {
      missing.push("device_datasheet.json");
    }

    if (found.datasets) {
      const datasetRows = datasetRowsFromJson(await found.datasets.text());
      fields.schemaVersion.value = normalizeBuilderSchemaVersion(
        datasetRows.find((row) => row?.schema_version)?.schema_version || fields.schemaVersion.value || "3.0.2",
      );
      state.datasets = datasetRows.map(datasetRecordFromSchema);
      state.activeDatasetIndex = 0;
      state.activeGroupIndex = 0;
      imported.push("datasets.json");
    } else {
      missing.push("datasets.json");
    }

    state.datasetTemplates = [];

    if (imported.length === 0) {
      throw new Error("No recognized metadata files were found. Expected files at the folder root or inside data/.");
    }

    if (state.datasets.length === 0) {
      state.datasets = [createDatasetRecord()];
      state.activeDatasetIndex = 0;
      state.activeGroupIndex = 0;
    }
    state.fileGroups = state.datasets[state.activeDatasetIndex]?.fileGroups || [createFileGroup()];
    syncControlsFromActiveDataset();
    renderAllMetadataSections();
    updateCrossrefOptions();
    updatePreview();

    showImportFile(packageFolderImportFile, getFolderSelectionName(files));
    removePackageFolderImportButton.hidden = false;
    packageFolderImportSummary.textContent = [
      `Imported ${imported.length} metadata file(s): ${imported.join(", ")}.`,
      missing.length ? `Missing: ${missing.join(", ")}.` : "",
    ].filter(Boolean).join(" ");
    packageFolderImportSummary.className = missing.length ? "import-summary warning" : "import-summary ok";
  } catch (error) {
    packageFolderImportSummary.textContent = `Could not import metadata folder: ${error.message}`;
    packageFolderImportSummary.className = "import-summary warning";
  } finally {
    packageFolderImport.value = "";
  }
}

function clearPackageFolderImport() {
  fields.schemaVersion.value = "3.0.2";
  fields.packageName.value = "";
  fields.packageTitle.value = "";

  fields.studyInternalId.value = "";
  fields.studyTitle.value = "";
  fields.studyPreregistration.value = "";
  fields.studyRegistration.value = "";
  fields.studyEthics.value = "";
  fields.studyType.value = "";
  fields.studyShortDescription.value = "";
  fields.studySample.value = "";
  fields.studySetting.value = "";
  fields.studyGeographicalLocation.value = "";
  fields.studyIntervention.value = "";
  fields.studyFundingSources.value = "";
  fields.studyKeywords.value = "";

  state.studyGroups = [];
  state.contributors = [];
  state.participants = [createParticipant()];
  state.characteristics = [];
  state.devices = [createDevice()];
  state.datasheets = [createDatasheet()];
  state.datasheetImportedFiles = [];
  state.datasets = [createDatasetRecord()];
  state.datasetTemplates = [];
  state.activeDatasetIndex = 0;
  state.activeGroupIndex = 0;
  state.fileGroups = state.datasets[0].fileGroups;

  packageFolderImport.value = "";
  removePackageFolderImportButton.hidden = true;
  hideImportFile(packageFolderImportFile);
  packageFolderImportSummary.textContent = "Imported metadata folder removed. Start a new package manually or import another metadata folder.";
  packageFolderImportSummary.className = "import-summary";

  studyImport.value = "";
  contributorsImport.value = "";
  participantsImport.value = "";
  characteristicsImport.value = "";
  devicesImport.value = "";
  datasheetsImport.value = "";
  datasetImport.value = "";
  hideImportFile(studyImportFile);
  hideImportFile(contributorsImportFile);
  hideImportFile(participantsImportFile);
  hideImportFile(characteristicsImportFile);
  hideImportFile(devicesImportFile);
  hideImportFile(datasheetsImportFile);
  hideImportFile(datasetImportFile);

  renderAllMetadataSections();
  syncControlsFromActiveDataset();
  updateCrossrefOptions();
  updatePreview();
}

function populatePackageFieldsFromDataPackage(datapackage) {
  if (!datapackage || typeof datapackage !== "object") {
    throw new Error("Expected datapackage.json to contain a datapackage object.");
  }

  fields.schemaVersion.value = normalizeBuilderSchemaVersion(
    datapackage.schema_version || fields.schemaVersion.value || "3.0.2",
  );
  loadSchemaHelp(fields.schemaVersion.value);
  fields.packageName.value = datapackage.name || "";
  fields.packageTitle.value = datapackage.title || "";
}

function parsePackageRows(file, jsonParser, tableParser) {
  return file.text().then((text) => isJsonLikeFile(file) ? jsonParser(text) : tableParser(text));
}

function findPackageMetadataFiles(files) {
  return {
    datapackage: findPackageFile(files, ["datapackage.json"]),
    study: findPackageFile(files, ["study.json"]),
    participants: findPackageFile(files, ["participants.csv", "participants.tsv", "participants.json"]),
    characteristics: findPackageFile(files, ["participant_characteristics.csv", "participant_characteristics.tsv", "participant_characteristics.json"]),
    devices: findPackageFile(files, ["devices.json"]),
    datasheets: findPackageFile(files, ["device_datasheet.json", "device_datasheets.json", "sensor_datasheet.json"]),
    datasets: findPackageFile(files, ["datasets.json"]),
  };
}

function findPackageFile(files, filenames) {
  const normalizedNames = filenames.map((name) => name.toLowerCase());
  const matches = files.filter((file) => normalizedNames.includes(file.name.toLowerCase()));
  return matches.find((file) => packageFilePath(file).toLowerCase().includes("/data/")) || matches[0] || null;
}

function packageFilePath(file) {
  return (file.webkitRelativePath || file.name).replace(/\\/g, "/");
}

function getFolderSelectionName(files) {
  const firstPath = packageFilePath(files[0] || {});
  return firstPath.includes("/") ? firstPath.split("/")[0] : "selected folder";
}

function isJsonLikeFile(file) {
  return file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
}

function renderAllMetadataSections() {
  renderStudyGroups();
  renderContributors();
  renderParticipants();
  renderCharacteristics();
  renderDevices();
  renderDatasheets();
  renderDatasetRecords();
  renderFileGroups();
  renderTerms();
  renderVariables();
}

const ZIP_SCHEMA_FILES = [
  "contributor.schema.json",
  "dataset.schema.json",
  "device.schema.json",
  "device_datasheet.schema.json",
  "participant_characteristics.schema.json",
  "participants.schema.json",
  "study.schema.json",
];

async function downloadPackageZip() {
  try {
    const files = await buildPackageZipFiles();
    const zipBlob = createZipBlob(files);
    downloadBlob(buildPackageZipFilename(), zipBlob);
  } catch (error) {
    if (exportValidationPanel) {
      exportValidationPanel.className = "export-validation-panel warning";
      exportValidationPanel.innerHTML = `
        <h3>Could not create zip</h3>
        <p>${escapeHtml(error.message)}</p>
      `;
    }
  }
}

function buildPackageZipFilename() {
  const packageName = String(fields.packageName.value || "")
    .trim()
    .replace(/\.zip$/i, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  if (!packageName) return "glc-metadata-package.zip";
  return `${packageName.endsWith("-package") ? packageName : `${packageName}-package`}.zip`;
}

function buildBuilderProject() {
  if (state.activeStep === "datasets") syncActiveDatasetFromControls();
  return {
    builder_project_version: "2.0.0",
    saved_at: new Date().toISOString(),
    schema_version: fields.schemaVersion.value || "3.0.2",
    form_values: Object.fromEntries(PROJECT_FIELD_KEYS.map((key) => [key, fields[key]?.value || ""])),
    active_step: state.activeStep,
    active_dataset_index: state.activeDatasetIndex,
    active_group_index: state.activeGroupIndex,
    study_groups: cloneJson(state.studyGroups),
    contributors: cloneJson(state.contributors),
    participants: cloneJson(state.participants),
    characteristics: cloneJson(state.characteristics),
    devices: cloneJson(state.devices),
    datasheets: cloneJson(state.datasheets),
    datasheet_imported_files: cloneJson(state.datasheetImportedFiles),
    dataset_templates: cloneJson(state.datasetTemplates),
    datasets: cloneJson(state.datasets),
  };
}

function restoreBuilderProject(project) {
  if (!project || !["1.0.0", "2.0.0"].includes(project.builder_project_version)) {
    throw new Error("The builder project file has an unsupported or invalid structure.");
  }
  if (!Array.isArray(project.datasets) || !Array.isArray(project.dataset_templates)) {
    throw new Error("The builder project file is missing dataset state.");
  }

  restoringDraft = true;
  const values = project.form_values || {};
  PROJECT_FIELD_KEYS.forEach((key) => {
    if (fields[key] && Object.hasOwn(values, key)) fields[key].value = values[key] ?? "";
  });
  fields.schemaVersion.value = normalizeBuilderSchemaVersion(
    project.schema_version || values.schemaVersion || "3.0.2",
  );

  state.studyGroups = cloneJson(project.study_groups || []);
  state.contributors = cloneJson(project.contributors || []);
  state.participants = cloneJson(project.participants || [createParticipant()]);
  state.characteristics = cloneJson(project.characteristics || []);
  state.devices = cloneJson(project.devices || [createDevice()]);
  state.datasheets = cloneJson(project.datasheets || [createDatasheet()]);
  state.datasheetImportedFiles = cloneJson(project.datasheet_imported_files || []);
  state.datasetTemplates = cloneJson(project.dataset_templates);
  state.datasets = cloneJson(project.datasets.length ? project.datasets : [createDatasetRecord()]);
  state.activeDatasetIndex = Math.min(Number(project.active_dataset_index) || 0, state.datasets.length - 1);
  state.activeGroupIndex = Number(project.active_group_index) || 0;
  state.fileGroups = state.datasets[state.activeDatasetIndex]?.fileGroups || [createFileGroup()];
  state.activeGroupIndex = Math.min(state.activeGroupIndex, Math.max(0, state.fileGroups.length - 1));
  state.activeStep = project.active_step || "project";

  renderAllMetadataSections();
  syncControlsFromActiveDataset();
  updateCrossrefOptions();
  loadSchemaHelp(fields.schemaVersion.value);
  setStep(state.activeStep);
  restoringDraft = false;
  updatePreview();
}

function downloadBuilderProjectBackup() {
  downloadText("glc-builder-project.json", JSON.stringify(buildBuilderProject(), null, 2), "application/json");
  draftDirtySinceBackup = false;
}

async function importBuilderProjectFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const project = JSON.parse(await file.text());
    restoreBuilderProject(project);
    autosaveReady = true;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(buildBuilderProject()));
    draftDirtySinceBackup = false;
    builderProjectImportStatus.textContent = `Resumed builder draft from ${file.name}.`;
  } catch (error) {
    builderProjectImportStatus.textContent = `Could not restore project backup: ${error.message}`;
  } finally {
    builderProjectImport.value = "";
  }
}

function builderHasMeaningfulContent() {
  if (PROJECT_FIELD_KEYS.some((key) => key !== "schemaVersion" && String(fields[key]?.value || "").trim())) return true;
  if (state.studyGroups.length || state.contributors.length || state.characteristics.length) return true;
  if (state.participants.some((row) => Object.values(row).some((value) => String(value || "").trim()))) return true;
  if (state.devices.some((row) => Object.values(row).some((value) => String(value || "").trim()))) return true;
  if (state.datasheets.some((row) => Object.values(row).some((value) => Array.isArray(value) ? value.length : String(value || "").trim()))) return true;
  return state.datasets.some(datasetHasUserContent);
}

function projectSnapshotHasMeaningfulContent(project) {
  const values = project?.form_values || {};
  if (PROJECT_FIELD_KEYS.some((key) => key !== "schemaVersion" && String(values[key] || "").trim())) return true;
  const rowHasValue = (row) => row && Object.values(row).some((value) => (
    Array.isArray(value) ? value.length > 0 : String(value || "").trim() !== ""
  ));
  if ((project.study_groups || []).some(rowHasValue)) return true;
  if ((project.contributors || []).some(rowHasValue)) return true;
  if ((project.participants || []).some(rowHasValue)) return true;
  if ((project.characteristics || []).some(rowHasValue)) return true;
  if ((project.devices || []).some(rowHasValue)) return true;
  if ((project.datasheets || []).some(rowHasValue)) return true;

  return (project.datasets || []).some((dataset) => {
    const datasetFields = [
      dataset.datasetId,
      dataset.studyId,
      dataset.participantId,
      dataset.deviceId,
      dataset.deviceLocation,
      dataset.samplingInterval,
      dataset.datasetTimezone,
      dataset.latitude,
      dataset.longitude,
      dataset.instructions,
      dataset.templateId,
    ];
    if (datasetFields.some((value) => String(value || "").trim())) return true;
    return (dataset.fileGroups || []).some((group) => {
      if ((group.files || []).length || (group.columns || []).length || (group.modalities || []).length) return true;
      if (Object.keys(group.variableState || {}).length) return true;
      if ((group.terms || []).some((entry) => entry.term && entry.term !== "other")) return true;
      return [
        group.modalityOther,
        group.instrumentType,
        group.instrumentName,
        group.collectionMethod,
        group.softwareName,
        group.collectionMethodOther,
        group.recordedBy,
        group.recordedByOther,
        group.description,
        group.deviceId,
        group.deviceLocation,
        group.samplingInterval,
        group.temporalResolutionUnit,
        group.instructions,
        group.collectionDatetime,
        group.datetimeDate,
        group.datetimeDateformat,
        group.datetimeTime,
        group.datetimeTimeformat,
        group.preprocessingDesc,
      ].some((value) => String(value || "").trim());
    });
  });
}

function scheduleDraftAutosave() {
  if (!autosaveReady || restoringDraft) return;
  draftDirtySinceBackup = builderHasMeaningfulContent();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveDraftToBrowser, 350);
}

function saveDraftToBrowser() {
  if (!builderHasMeaningfulContent()) {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    draftDirtySinceBackup = false;
    return;
  }
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(buildBuilderProject()));
  } catch (error) {
    console.warn("Could not autosave the GLC builder draft.", error);
  }
}

function readBrowserDraft() {
  try {
    const serialized = localStorage.getItem(DRAFT_STORAGE_KEY);
    return serialized ? JSON.parse(serialized) : null;
  } catch (error) {
    console.warn("Could not read the saved GLC builder draft.", error);
    return null;
  }
}

function startOver() {
  if (builderHasMeaningfulContent()) {
    const confirmed = window.confirm(
      "Start over with a blank package? This clears the current form and its browser-saved draft. Downloaded files will not be affected."
    );
    if (!confirmed) return;
  }

  autosaveReady = false;
  draftDirtySinceBackup = false;
  clearTimeout(autosaveTimer);
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear the browser-saved GLC draft.", error);
  }
  window.location.reload();
}

function initializeDraftPersistence() {
  const status = document.querySelector("#local-draft-status");
  const message = document.querySelector("#local-draft-status-message");
  const savedDraft = readBrowserDraft();
  if (!savedDraft || !projectSnapshotHasMeaningfulContent(savedDraft)) {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    autosaveReady = true;
    return;
  }

  try {
    restoreBuilderProject(savedDraft);
    autosaveReady = true;
    draftDirtySinceBackup = false;
    status.hidden = false;
    if (savedDraft.saved_at) {
      const savedAt = new Date(savedDraft.saved_at);
      if (!Number.isNaN(savedAt.valueOf())) {
        message.textContent = `Browser-saved draft restored from ${savedAt.toLocaleString()}.`;
      }
    }
  } catch (error) {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    autosaveReady = true;
    console.warn("Could not restore the browser-saved GLC draft.", error);
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || link.getAttribute("aria-current") === "page") return;
  if (!draftDirtySinceBackup || !builderHasMeaningfulContent()) return;
  saveDraftToBrowser();
  const shouldLeave = window.confirm(
    "Your current draft has been autosaved in this browser. Leave the metadata builder?"
  );
  if (!shouldLeave) {
    event.preventDefault();
    return;
  }
  draftDirtySinceBackup = false;
});

async function buildPackageZipFiles() {
  const schemaVersion = fields.schemaVersion.value || "3.0.2";
  const files = [
    {
      path: "datapackage.json",
      text: JSON.stringify(buildDataPackage(), null, 2),
    },
    {
      path: "data/study.json",
      text: JSON.stringify(buildStudyDraft(), null, 2),
    },
    {
      path: "data/participants.csv",
      text: buildParticipantsCsv(),
    },
    {
      path: "data/devices.json",
      text: JSON.stringify(buildDevicesDraft(), null, 2),
    },
    {
      path: "data/device_datasheet.json",
      text: JSON.stringify(buildDatasheetsDraft(), null, 2),
    },
    {
      path: "data/datasets.json",
      text: JSON.stringify(buildDatasetDraft(), null, 2),
    },
    {
      path: "README.txt",
      text: [
        "GLC metadata package generated by the browser metadata builder.",
        "",
        "This zip contains generated metadata files and the schema bundle referenced by datapackage.json.",
        "It does not include the original data files selected in the dataset file assistant.",
        "Before running the full validator, add referenced data files under the paths declared in data/datasets.json.",
      ].join("\n"),
    },
  ];

  if (buildCharacteristicsRows().length > 0) {
    files.push({
      path: "data/participant_characteristics.csv",
      text: buildCharacteristicsCsv(),
    });
  }

  const profileFilename = schemaVersion === "3.0.2"
    ? "glc-dp-profile.json"
    : "gleam-dp-profile.json";
  const schemaFiles = await Promise.all([...ZIP_SCHEMA_FILES, profileFilename].map(async (filename) => {
    const response = await fetch(`schemas/${schemaVersion}/${filename}`);
    if (!response.ok) {
      throw new Error(`Could not load schema file ${filename}`);
    }
    return {
      path: `schemas/${schemaVersion}/${filename}`,
      text: await response.text(),
    };
  }));

  return files.concat(schemaFiles);
}

function createZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encodeText(file.path);
    const dataBytes = encodeText(file.text);
    const crc = crc32(dataBytes);
    const { time, date } = zipDateTime(new Date());

    const localHeader = zipHeader(30);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, time);
    writeUint16(localHeader, 12, date);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, dataBytes.length);
    writeUint32(localHeader, 22, dataBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);

    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = zipHeader(46);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, time);
    writeUint16(centralHeader, 14, date);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, dataBytes.length);
    writeUint32(centralHeader, 24, dataBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);

    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const endHeader = zipHeader(22);
  writeUint32(endHeader, 0, 0x06054b50);
  writeUint16(endHeader, 4, 0);
  writeUint16(endHeader, 6, 0);
  writeUint16(endHeader, 8, files.length);
  writeUint16(endHeader, 10, files.length);
  writeUint32(endHeader, 12, centralSize);
  writeUint32(endHeader, 16, offset);
  writeUint16(endHeader, 20, 0);

  return new Blob([...localParts, ...centralParts, endHeader], { type: "application/zip" });
}

function encodeText(text) {
  return new TextEncoder().encode(String(text));
}

function zipHeader(size) {
  return new Uint8Array(size);
}

function writeUint16(bytes, offset, value) {
  new DataView(bytes.buffer).setUint16(offset, value, true);
}

function writeUint32(bytes, offset, value) {
  new DataView(bytes.buffer).setUint32(offset, value >>> 0, true);
}

function zipDateTime(value) {
  return {
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
    date: ((value.getFullYear() - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate(),
  };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = ZIP_CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const ZIP_CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadSchema(filename) {
  const schemaVersion = fields.schemaVersion.value || "3.0.2";
  const response = await fetch(`schemas/${schemaVersion}/${filename}`);
  const text = await response.text();
  downloadText(filename, text, "application/json");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

initializeTimeZoneOptions();
renderStudyGroups();
renderParticipants();
renderCharacteristics();
renderDatasheets();
renderDevices();
renderDatasetRecords();
syncControlsFromActiveDataset();
renderFileGroups();
renderTerms();
renderVariables();
updateCrossrefOptions();
updatePreview();
loadSchemaHelp();
initializeDraftPersistence();

if (window.ResizeObserver && builderPanel) {
  new ResizeObserver(schedulePreviewHeightSync).observe(builderPanel);
}

window.addEventListener("resize", schedulePreviewHeightSync);
window.addEventListener("beforeunload", (event) => {
  if (!draftDirtySinceBackup || !builderHasMeaningfulContent()) return;
  event.preventDefault();
  event.returnValue = "";
});
