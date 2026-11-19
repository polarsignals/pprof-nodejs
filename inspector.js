const { Session } = require('node:inspector/promises');
const { fileURLToPath } = require('node:url');
const { promisify } = require('node:util');
const { gzip } = require('node:zlib');
const {
  Function: ProfileFunction, Line, Location, Mapping, Profile, Sample, ValueType,
} = require('pprof-format');
const { debugIdFor } = require('./debug-ids');

const compress = promisify(gzip);
let active = false;

async function startHeapProfiler({ samplingInterval = 512 * 1024, stackDepth = 64 } = {}) {
  if (active) {
    throw new Error('Heap profiling is already active');
  }
  for (const [name, value] of Object.entries({ samplingInterval, stackDepth })) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name} must be a positive integer`);
    }
  }

  const session = new Session();
  active = true;
  try {
    session.connect();
    await session.post('HeapProfiler.startSampling', { samplingInterval, stackDepth });
  } catch (error) {
    session.disconnect();
    active = false;
    throw error;
  }

  let stopping;
  return {
    async encodedProfile() {
      if (stopping) {
        throw new Error('Heap profiling has stopped');
      }
      const { profile } = await session.post('HeapProfiler.getSamplingProfile');
      return compress(toPprof(profile.head, samplingInterval).encode());
    },
    stop() {
      // Disable stops the sampler without collecting a final profile.
      stopping ??= session.post('HeapProfiler.disable').finally(() => {
        session.disconnect();
        active = false;
      });
      return stopping;
    },
  };
}

function toPprof(root, samplingInterval) {
  const profile = new Profile({ period: samplingInterval, timeNanos: BigInt(Date.now()) * 1_000_000n });
  const table = profile.stringTable;
  const sampleType = new ValueType({ type: table.dedup('inuse_space'), unit: table.dedup('bytes') });
  profile.sampleType.push(sampleType);
  profile.periodType = sampleType;
  profile.defaultSampleType = sampleType.type;
  const mappings = new Map();

  function visit(node, parents) {
    const { functionName, url, lineNumber, columnNumber } = node.callFrame;
    const filename = frameFilename(url);
    const line = lineNumber + 1;
    const debugId = filename && debugIdFor(filename);
    let name = functionName || 'anonymous';
    let mappingId;
    if (debugId) {
      mappingId = mappings.get(debugId);
      if (mappingId === undefined) {
        mappingId = profile.mapping.length + 1;
        mappings.set(debugId, mappingId);
        profile.mapping.push(new Mapping({
          id: mappingId, filename: table.dedup('v8js'), buildId: table.dedup(debugId),
        }));
      }
      if (line > 0 && columnNumber >= 0) {
        name += `:L${line}:C${columnNumber + 1}`;
      }
    }

    profile.function.push(new ProfileFunction({
      id: node.id, name: table.dedup(name), filename: table.dedup(filename),
    }));
    profile.location.push(new Location({
      id: node.id, mappingId, line: [new Line({ functionId: node.id, line })],
    }));
    const stack = [node.id, ...parents];
    // Inspector already reports an estimated live byte total at every node.
    if (node.selfSize > 0) {
      profile.sample.push(new Sample({ locationId: stack, value: [node.selfSize] }));
    }
    for (const child of node.children) {
      visit(child, stack);
    }
  }

  visit(root, []);
  return profile;
}

function frameFilename(url) {
  if (url.startsWith('file:')) {
    try {
      return fileURLToPath(url);
    } catch {
      // A script's sourceURL can look like a file URL without naming a local file.
    }
  }
  return url;
}

module.exports = { startHeapProfiler };
