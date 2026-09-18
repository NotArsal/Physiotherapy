
const tf = require('@tensorflow/tfjs');

async function runBenchmark() {
  try {
    const model = await tf.loadLayersModel('file://./frontend/public/model/model.json');
    console.log('Model loaded successfully.');
    const dummyInput = tf.zeros([1, 30, 99]);
    for (let i = 0; i < 50; i++) { model.predict(dummyInput); }
    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) { model.predict(dummyInput); }
    const end = performance.now();
    const avgMs = (end - start) / iterations;
    console.log('TF.js Model Inference: ' + avgMs.toFixed(3) + ' ms per prediction');
  } catch (err) {
    console.error('Benchmark failed:', err);
  }
}
runBenchmark();

