(function initializeDatetimeMetadataTests(root, factory) {
  const runTests = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = runTests;
    if (require.main === module) {
      runTests(require("../datetime-metadata.js"));
    }
  }
  root.runDatetimeMetadataTests = runTests;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDatetimeMetadataTests() {
  function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
  }

  return function runDatetimeMetadataTests(api) {
    const columnMetadata = api.buildFileDatetimeFromGroup({
      datetimeSource: "column",
      collectionDatetime: "",
      datetimeDate: "date",
      datetimeDateformat: "YYYY-MM-DD",
      datetimeTime: "time",
      datetimeTimeformat: "HH:mm:ss",
    });
    assertEqual(columnMetadata, {
      dataset_file_datetime_source: "column",
      dataset_file_datetime_date: "date",
      dataset_file_datetime_dateformat: "YYYY-MM-DD",
      dataset_file_datetime_time: "time",
      dataset_file_datetime_timeformat: "HH:mm:ss",
    }, "Column-based datetime export should preserve separate date and time columns.");

    const collectionMetadata = api.buildFileDatetimeFromGroup({
      datetimeSource: "collection",
      collectionDatetime: "2026-07-13",
      datetimeDate: "ignored",
      datetimeDateformat: "YYYY-MM-DD",
      datetimeTime: "ignored",
      datetimeTimeformat: "ignored",
    });
    assertEqual(collectionMetadata, {
      dataset_file_datetime_source: "collection",
      dataset_file_datetime_date: "2026-07-13",
      dataset_file_datetime_dateformat: "YYYY-MM-DD",
    }, "Collection datetime export should omit column-only fields.");

    const importedGroup = api.applyFileDatetimeToGroup({}, collectionMetadata);
    assertEqual(importedGroup, {
      datetimeSource: "collection",
      datetimeDateformat: "YYYY-MM-DD",
      collectionDatetime: "2026-07-13",
      datetimeDate: "",
      datetimeTime: "",
      datetimeTimeformat: "",
    }, "Collection datetime import should populate the collection control.");

    const missingSourceGroup = api.applyFileDatetimeToGroup({}, {
      dataset_file_datetime_date: "timestamp",
      dataset_file_datetime_dateformat: "YYYY-MM-DD HH:mm:ss",
    });
    assertEqual(missingSourceGroup.datetimeSource, "", "Import must not invent a missing datetime source.");

    return true;
  };
}));
