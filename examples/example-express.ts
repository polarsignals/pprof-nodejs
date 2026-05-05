import type { Request, Response } from 'express';
import { heapProfiler, monitorOutOfMemory } from '@polarsignals/pprof';

let express: typeof import('express');
try {
  express = require('express');
} catch {
  console.error('Express is not installed. Please install it to run this example:');
  console.error('npm install express');
  process.exit(1);
}

const app = express();
const port = 3000;

heapProfiler.start(512 * 1024, 64);

monitorOutOfMemory({
  exportOptions: {
    labels: {
      service: 'express-example',
      version: '1.0.0',
      oom: 'true',
    },
  },
});

const leakedArrays: string[][] = [];
let requestCount = 0;

function allocateMemory(): void {
  requestCount++;
  for (let i = 0; i < 4; i++) {
    const largeArray = new Array(50000).fill(
      `request-${requestCount}-${i}-${'x'.repeat(20)}`,
    );
    leakedArrays.push(largeArray);
  }
}

app.get('/', (_req: Request, res: Response) => {
  allocateMemory();
  res.send('Hello World!');
});

app.get('/debug/pprof/allocs', async (_req: Request, res: Response) => {
  try {
    const encodedProfile = await heapProfiler.encodedProfile();
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', 'attachment; filename="profile.pb.gz"');
    res.send(encodedProfile);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Express server with profiling running on http://localhost:${port}`);
  console.log(`Heap profile available at http://localhost:${port}/debug/pprof/allocs`);
});
