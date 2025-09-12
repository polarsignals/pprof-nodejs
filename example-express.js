let express;
try {
  express = require('express');
} catch (error) {
  console.error('Express is not installed. Please install it to run this example:');
  console.error('npm install express');
  process.exit(1);
}

const { heapProfiler, monitorOutOfMemory } = require('./index.js');

const app = express();
const port = 3000;

// Start heap profiling
heapProfiler.start(512 * 1024, 64); // 512KB sampling, stack depth 64

// Monitor for out-of-memory events and auto-upload profiles
monitorOutOfMemory({
  exportOptions: {
    labels: {
      'service': 'express-example',
      'version': '1.0.0'
    },
  }
});

// Memory leak simulation - arrays that don't get freed
const leakedArrays = [];
let requestCount = 0;

const allocateMemory = () => {
  requestCount++;

  // Allocate memory that won't be freed
  for (let i = 0; i < 4; i++) {
    const largeArray = new Array(50000).fill(`request-${requestCount}-${i}-${'x'.repeat(20)}`);
    leakedArrays.push(largeArray);
  }
};

// Basic route
app.get('/', (req, res) => {
  allocateMemory();
  res.send('Hello World!');
});

// Serve pprof profile on demand
app.get('/debug/pprof/allocs', async (req, res) => {
  try {
    const encodedProfile = await heapProfiler.encodedProfile();
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', 'attachment; filename="profile.pb.gz"');
    res.send(encodedProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Express server with profiling running on http://localhost:${port}`);
  console.log(`📊 Access heap profile at http://localhost:${port}/debug/pprof/heap`);
});
