# `@polarsignals/pprof` examples

Two leaky Node apps that exercise the heap-profile path with Polar Signals
Cloud sourcemap resolution.

- `example.ts` — standalone, leaks until OOM (handled by `monitorOutOfMemory`).
- `example-express.ts` — express server, exposes `GET /debug/pprof/allocs` for Parca to scrape.

## Build

```bash
POLARSIGNALS_PROJECT_ID=... POLARSIGNALS_TOKEN=... pnpm run build
```

esbuild bundles into `dist/`; the plugin injects debug IDs and uploads source maps.

## Run

```bash
pnpm run example          # standalone
pnpm run example:express  # express on :3000
```

