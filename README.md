# @polarsignals/pprof

Node.js profiling library that automatically uploads heap profiles to Polar Signals.

## Installation

```bash
npm install @polarsignals/pprof
```

## Usage

```javascript
const { heapProfiler, monitorOutOfMemory } = require('@polarsignals/pprof');

// Start heap profiling
heapProfiler.start(512 * 1024, 64); // 512KB sampling, stack depth 64

// Monitor for out-of-memory events and auto-upload profiles
monitorOutOfMemory({
  exportOptions: {
    labels: { service: 'my-app', version: '1.0.0' },
  },
});

// Resolve frames locally against .map files; skips server-side resolution.
const profile = await heapProfiler.encodedProfile({
  localSourceMapRoots: [process.cwd()],
});
```

`endpoint`, `projectId`, and `token` fall back to `POLARSIGNALS_SERVER_URL`,
`POLARSIGNALS_PROJECT_ID`, and `POLARSIGNALS_TOKEN` env vars respectively, so
typical deployments don't need to set them in code.

## `exportOptions`

| Field        | Type                     | Default                                              | Description                                                                                                                                       |
| ------------ | ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field                 | Type                     | Default                                              | Description                                                                                                                                       |
| --------------------- | ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `endpoint`            | `string`                 | `https://api.polarsignals.com/api/parca/profilestore` | Profile-store base URL.                                                                                                                           |
| `projectId`           | `string`                 | `$POLARSIGNALS_PROJECT_ID`                           | Polar Signals project UUID.                                                                                                                       |
| `labels`              | `Record<string, string>` | —                                                    | Extra series labels attached to the profile (e.g. `service`, `version`).                                                                          |
| `headers`             | `Record<string, string>` | —                                                    | Extra HTTP headers added to the upload request.                                                                                                   |
| `timeout`             | `number`                 | `30000`                                              | Request timeout in ms.                                                                                                                            |
| `localSourceMapRoots` | `string[]`               | —                                                    | If set, the OOM upload-worker resolves frames against `.map` files in these dirs and skips server-side resolution. The same option is available on `heapProfiler.encodedProfile` — see below. |

The bearer token is read exclusively from `POLARSIGNALS_TOKEN` env var.

## `heapProfiler.encodedProfile(options?)`

Returns a gzipped pprof Buffer for ad-hoc serving (e.g. a `/debug/pprof/allocs` endpoint).

| Field                 | Type       | Default | Description                                                                                                                                                                                                                          |
| --------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `localSourceMapRoots` | `string[]` | —       | If set, the lib walks these directories for `.map` files and resolves frames locally at encode time, skipping server-side resolution. If omitted, frames are encoded for server-side resolution. |

## Heap sampling on Node Caged

The `@polarsignals/pprof/inspector` entry point uses the Inspector session built
into Node.js. It works with pointer compression and does not load the Datadog
native addon or listen on a debugger port.

```javascript
const { startHeapProfiler } = require('@polarsignals/pprof/inspector');

const profiler = await startHeapProfiler({ samplingInterval: 512 * 1024, stackDepth: 64 });
try {
  // Run the workload before capturing the profile.
  const profile = await profiler.encodedProfile();
  // Serve or write the gzipped pprof buffer.
} finally {
  await profiler.stop();
}
```

The profile reports estimated live heap bytes (`inuse_space`) and preserves
bundle debug IDs for server-side source mapping. Use this entry point for
on-demand profiles. V8 can force garbage collection while collecting a
profile. Use one heap sampler per V8 isolate. Near-OOM uploads and local
source-map resolution are available through the native entry point.

## Features

- Automatic heap profile collection
- Out-of-memory monitoring with automatic profile upload
- Background upload process to ensure profiles are saved even during crashes
- Configurable labels for profile metadata