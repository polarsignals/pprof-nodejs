const { heapProfiler, monitorOutOfMemory } = require('./index.js');

// User starts heap profiling
heapProfiler.start(512 * 1024, 64); // 512KB sampling, stack depth 64

monitorOutOfMemory({
  exportOptions: {
    labels: {
      'service': 'my-app',
      'version': '1.0.0'
    },
  }
});

async function start() {
  try {
    const arrays = [];
    let iteration = 0;
    
    const allocateMemory = () => {
      iteration++;
      
      for (let i = 0; i < 8; i++) {
        const largeArray = new Array(150000).fill(`data-${iteration}-${i}-${'x'.repeat(50)}`);
        arrays.push(largeArray);
      }
      
      setTimeout(allocateMemory, 100);
    };
    
    allocateMemory();
    
  } catch (error) {
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  process.exit(0);
});

start();
