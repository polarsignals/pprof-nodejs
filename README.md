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
```

`endpoint`, `projectId`, and `token` fall back to `POLARSIGNALS_SERVER_URL`,
`POLARSIGNALS_PROJECT_ID`, and `POLARSIGNALS_TOKEN` env vars respectively, so
typical deployments don't need to set them in code.

## `exportOptions`

| Field        | Type                     | Default                                              | Description                                                                                                                                       |
| ------------ | ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `endpoint`   | `string`                 | `https://api.polarsignals.com/api/parca/profilestore` | Profile-store base URL.                       |
| `projectId`  | `string`                 | `$POLARSIGNALS_PROJECT_ID`                           | Polar Signals project UUID.                       |
| `labels`     | `Record<string, string>` | —                                                    | Extra series labels attached to the profile (e.g. `service`, `version`).                                                                          |
| `headers`    | `Record<string, string>` | —                                                    | Extra HTTP headers added to the upload request.                                                                                                   |
| `timeout`    | `number`                 | `30000`                                              | Request timeout in ms.                                                                                                                            |

The bearer token is read exclusively from `POLARSIGNALS_TOKEN` env var.

## Features

- Automatic heap profile collection
- Out-of-memory monitoring with automatic profile upload
- Background upload process to ensure profiles are saved even during crashes
- Configurable labels for profile metadata