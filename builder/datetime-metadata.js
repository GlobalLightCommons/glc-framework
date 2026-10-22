(function initializeDatetimeMetadata(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.GlcDatetimeMetadata = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDatetimeMetadataApi() {
  function applyFileDatetimeToGroup(group, metadata) {
    if (!metadata || typeof metadata !== "object") {
      return group;
    }

    group.datetimeSource = metadata.dataset_file_datetime_source || "";
    group.datetimeDateformat = metadata.dataset_file_datetime_dateformat || "";
    if (group.datetimeSource === "collection") {
      group.collectionDatetime = metadata.dataset_file_datetime_date || "";
      group.datetimeDate = "";
      group.datetimeTime = "";
      group.datetimeTimeformat = "";
    } else {
      group.collectionDatetime = "";
      group.datetimeDate = metadata.dataset_file_datetime_date || "";
      group.datetimeTime = metadata.dataset_file_datetime_time || "";
      group.datetimeTimeformat = metadata.dataset_file_datetime_timeformat || "";
    }
    return group;
  }

  function buildFileDatetimeFromGroup(group, suggestedDateColumn = "") {
    const source = group.datetimeSource || "";
    const metadata = {
      dataset_file_datetime_source: source,
      dataset_file_datetime_date: source === "collection"
        ? group.collectionDatetime || ""
        : group.datetimeDate || suggestedDateColumn,
      dataset_file_datetime_dateformat: group.datetimeDateformat || "",
    };
    if (source === "column" && group.datetimeTime) {
      metadata.dataset_file_datetime_time = group.datetimeTime;
      metadata.dataset_file_datetime_timeformat = group.datetimeTimeformat || "";
    }
    return metadata;
  }

  return {
    applyFileDatetimeToGroup,
    buildFileDatetimeFromGroup,
  };
}));
