const path = require('node:path');
const { encode, heap } = require('@datadog/pprof');
const { Mapping } = require('pprof-format');
const { debugIdFor } = require('./debug-ids');

// pprof Line has no column field. Encode V8's column as a `:L#<line>:C#<col>`
// suffix on the function name via the serializer's source-mapper hook.
const COLUMN_ENCODING_SOURCE_MAPPER = {
  // Only called for frames with line > 0 and defined column (per isGeneratedLocation).
  mappingInfo(loc) {
    // Only applied to bundles with a //# debugId= marker.
    if (!loc.file || debugIdFor(loc.file) === null) return loc;
    const baseName = loc.name || 'anonymous';
    return {
      ...loc,
      name: `${baseName}:L#${loc.line}:C#${loc.column}`,
    };
  },
};

// Tag JS frames with a v8js Mapping + build_id so consumers can resolve them
// against the matching sourcemap.
function injectBuildIds(profile) {
  const st = profile.stringTable;
  const v8jsFilenameId = st.dedup('v8js');
  const pathToMappingId = new Map();
  let nextId = profile.mapping.length + 1;

  for (const fn of profile.function) {
    const fname = st.strings[Number(fn.filename)];
    if (!fname || pathToMappingId.has(fname)) continue;
    const debugId = debugIdFor(fname);
    if (debugId === null) continue;
    profile.mapping.push(
      new Mapping({
        id: nextId,
        filename: v8jsFilenameId,
        buildId: st.dedup(debugId),
      }),
    );
    pathToMappingId.set(fname, nextId);
    nextId++;
  }
  if (pathToMappingId.size === 0) return;

  // Assign the mapping to the correct location references.
  for (const loc of profile.location) {
    const firstLine = loc.line[0];
    if (!firstLine) continue;
    const fn = profile.function[Number(firstLine.functionId) - 1];
    if (!fn) continue;
    const mid = pathToMappingId.get(st.strings[Number(fn.filename)]);
    if (mid != null) loc.mappingId = mid;
  }
}

module.exports = {
  heapProfiler: {
    ...heap,
    async encodedProfile() {
      const profile = heap.profile('', COLUMN_ENCODING_SOURCE_MAPPER);
      injectBuildIds(profile);
      return await encode(profile);
    },
  },
  monitorOutOfMemory(config = {}) {
    heap.monitorOutOfMemory(
      0,
      0,
      false,
      [
        process.execPath,
        path.join(__dirname, 'upload-worker.js'),
        JSON.stringify(config.exportOptions),
      ],
      null, // no callback, just the above export command
      0, // not async
    );
  },
};
