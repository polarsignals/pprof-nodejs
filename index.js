const pprof = require('@datadog/pprof');
const { SourceMapper, encode } = require('@datadog/pprof');

module.exports = {
  heapProfiler: {
    ...pprof.heap,
    async encodedProfile(sourceRoots = [process.cwd()]) {
      const mapper = await SourceMapper.create(sourceRoots);
      const profile = await pprof.heap.profile("", mapper);
      return await encode(profile);
    }
  },
  monitorOutOfMemory: function(config = {}) {
    const path = require('path');
    pprof.heap.monitorOutOfMemory(
      0,
      0,
      false,
      [process.execPath,
        path.join(__dirname, 'upload-worker.js'),
        JSON.stringify(config.exportOptions)
      ],
      null, // no callback, just the above export command
      0 // not async
    );
  }
};
