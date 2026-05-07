import { heapProfiler, monitorOutOfMemory } from '@polarsignals/pprof';

heapProfiler.start(512 * 1024, 64);

monitorOutOfMemory({
  exportOptions: {
    labels: {
      service: 'my-app',
      version: '1.0.0',
    },
  },
});

function buildLargePayload(iteration: number, slot: number): string[] {
  return new Array(150000).fill(`data-${iteration}-${slot}-${'x'.repeat(50)}`);
}

function start(): void {
  const arrays: string[][] = [];
  let iteration = 0;

  const allocateMemory = (): void => {
    iteration++;
    for (let slot = 0; slot < 8; slot++) {
      arrays.push(buildLargePayload(iteration, slot));
    }
    setTimeout(allocateMemory, 100);
  };

  allocateMemory();
}

process.on('SIGINT', () => {
  process.exit(0);
});

start();
