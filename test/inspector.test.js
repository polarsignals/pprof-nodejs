const assert = require('node:assert/strict');
const { test } = require('node:test');
const { gunzipSync } = require('node:zlib');
const { Profile } = require('pprof-format');
const { startHeapProfiler } = require('../inspector');

test('exports live heap samples as pprof and can restart', async () => {
  await assert.rejects(startHeapProfiler({ samplingInterval: 0 }), /positive integer/);
  const profiler = await startHeapProfiler({ samplingInterval: 128 });
  try {
    await assert.rejects(startHeapProfiler(), /already active/);

    function allocateForProfile() {
      return Array.from({ length: 10_000 }, () => new Array(64).fill(42));
    }

    const retained = allocateForProfile();
    const profile = Profile.decode(gunzipSync(await profiler.encodedProfile()));
    const strings = profile.stringTable.strings;
    assert.equal(strings[Number(profile.defaultSampleType)], 'inuse_space');
    assert.equal(strings[Number(profile.sampleType[0].unit)], 'bytes');
    assert.equal(Number(profile.period), 128);

    const allocation = profile.function.find(fn =>
      strings[Number(fn.name)].startsWith('allocateForProfile:L'));
    assert.ok(allocation, 'expected a sampled allocation frame with a source location');
    const location = profile.location.find(loc => loc.line[0].functionId === allocation.id);
    assert.ok(location);
    assert.ok(profile.sample.some(sample => sample.locationId.includes(location.id) &&
      Number(sample.value[0]) > 0));
    const mapping = profile.mapping.find(entry => entry.id === location.mappingId);
    assert.ok(mapping, 'expected a mapping for the allocation frame');
    assert.equal(strings[Number(mapping.filename)], 'v8js');
    assert.equal(strings[Number(mapping.buildId)], '1ebd73a1-60a1-4385-b46c-579344bb8952');
    assert.equal(retained[0][0], 42);
  } finally {
    await profiler.stop();
  }

  await assert.rejects(profiler.encodedProfile(), /has stopped/);
  const next = await startHeapProfiler();
  await profiler.stop();
  try {
    await next.encodedProfile();
  } finally {
    await next.stop();
  }

  assert.equal(Object.keys(require.cache).some(path => path.endsWith('.node')), false);
});
//# debugId=1ebd73a1-60a1-4385-b46c-579344bb8952
