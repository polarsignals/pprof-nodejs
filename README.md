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
    labels: {
      'service': 'my-app',
      'version': '1.0.0'
    }
  }
});
```

## Configuration

Set your Polar Signals API token:

```bash
export POLAR_SIGNALS_TOKEN=your_token_here
```

## Features

- Automatic heap profile collection
- Out-of-memory monitoring with automatic profile upload
- Background upload process to ensure profiles are saved even during crashes
- Configurable labels for profile metadata