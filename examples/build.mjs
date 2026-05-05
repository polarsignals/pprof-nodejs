import * as esbuild from 'esbuild';
import { debugIdPlugin } from '@polarsignals/sourcemap-esbuild-plugin';

const projectID = process.env.POLARSIGNALS_PROJECT_ID;
const token = process.env.POLARSIGNALS_TOKEN;

const plugins = [];
if (projectID && token) {
  plugins.push(debugIdPlugin({
    projectID,
    token,
  }));
} else {
  console.warn(
    '[build] POLARSIGNALS_PROJECT_ID or POLARSIGNALS_TOKEN is unset — building without debug-id injection or upload',
  );
}

const common = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: true,
  minify: true,
  external: ['@polarsignals/pprof', '@datadog/pprof', 'pprof-format', 'express'],
  plugins,
  logLevel: 'info',
};

await esbuild.build({
  ...common,
  entryPoints: ['example.ts'],
  outfile: 'dist/example.js',
});

await esbuild.build({
  ...common,
  entryPoints: ['example-express.ts'],
  outfile: 'dist/example-express.js',
});
