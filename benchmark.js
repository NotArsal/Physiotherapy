const { performance } = require('perf_hooks');

function flattenAndImputeFrame(frameLandmarks) {
  if (!frameLandmarks || frameLandmarks.length < 33) return new Array(99).fill(0.0);
  const getLMData = (lm) => {
    if (lm && typeof lm.x === 'number') return [lm.x, lm.y, lm.visibility || 0.0];
    return [0.0, 0.0, 0.0];
  };

  const [ls_x, ls_y, ls_v] = getLMData(frameLandmarks[11]);
  const [rs_x, rs_y, rs_v] = getLMData(frameLandmarks[12]);
  let shoulder_width = 0.20;
  if (ls_v > 0.5 && rs_v > 0.5) shoulder_width = Math.sqrt(Math.pow(rs_x - ls_x, 2) + Math.pow(rs_y - ls_y, 2));

  const lower_body_indices = [23, 24, 25, 26, 27, 28];
  let lowVisibilityCount = 0;
  for (const idx of lower_body_indices) {
    if (getLMData(frameLandmarks[idx])[2] < 0.5) lowVisibilityCount++;
  }

  const imputedFrame = [...frameLandmarks];
  if (lowVisibilityCount >= 2) {
    const hip_y = Math.max(ls_y, rs_y) + 1.2 * shoulder_width;
    const knee_y = hip_y + 1.5 * shoulder_width;
    const ankle_y = knee_y + 1.5 * shoulder_width;
    const heel_y = ankle_y + 0.1 * shoulder_width;
    const toe_y = ankle_y + 0.2 * shoulder_width;
    imputedFrame[23] = { x: ls_x, y: hip_y, z: 0, visibility: 1.0 };
    imputedFrame[24] = { x: rs_x, y: hip_y, z: 0, visibility: 1.0 };
    imputedFrame[25] = { x: ls_x, y: knee_y, z: 0, visibility: 1.0 };
    imputedFrame[26] = { x: rs_x, y: knee_y, z: 0, visibility: 1.0 };
    imputedFrame[27] = { x: ls_x, y: ankle_y, z: 0, visibility: 1.0 };
    imputedFrame[28] = { x: rs_x, y: ankle_y, z: 0, visibility: 1.0 };
    imputedFrame[29] = { x: ls_x, y: heel_y, z: 0, visibility: 1.0 };
    imputedFrame[30] = { x: rs_x, y: heel_y, z: 0, visibility: 1.0 };
    imputedFrame[31] = { x: ls_x, y: toe_y, z: 0, visibility: 1.0 };
    imputedFrame[32] = { x: rs_x, y: toe_y, z: 0, visibility: 1.0 };
  }
  const features = [];
  for (let i = 0; i < 33; i++) {
    const [x, y, v] = getLMData(imputedFrame[i]);
    features.push(x, y, v);
  }
  return features;
}

const dummyLandmarks = [];
for (let i = 0; i < 33; i++) {
  dummyLandmarks.push({
    x: i * 0.1, y: i * 0.1, z: 0.0,
    visibility: (i >= 23 && i <= 28) ? 0.1 : 0.9
  });
}

// Warm-up
for (let i = 0; i < 10000; i++) flattenAndImputeFrame(dummyLandmarks);

const iterations = 1000000;
const start = performance.now();
for (let i = 0; i < iterations; i++) flattenAndImputeFrame(dummyLandmarks);
const durationMs = performance.now() - start;

const avgUs = (durationMs * 1000) / iterations;
console.log("JS Average time per frame: " + avgUs.toFixed(4) + " microseconds");
