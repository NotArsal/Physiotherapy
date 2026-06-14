import * as tf from '@tensorflow/tfjs';

// The exercise catalog corresponding to the model's output neurons
const EXERCISES = [
    'barbell_biceps_curl', 'bench_press', 'chest_fly_machine', 'deadlift', 
    'hammer_curl', 'hip_thrust', 'incline_bench_press', 'lat_pulldown', 
    'leg_extension', 'leg_raises', 'plank', 'pull_up', 'push_up', 
    'romanian_deadlift', 'russian_twist', 'shoulder_press', 'squat', 
    't_bar_row', 'tricep_dips'
];

class TFJSService {
  private model: tf.LayersModel | null = null;
  private isInitializing: boolean = false;
  private loadFailed: boolean = false;

  async loadModel() {
    if (this.model) return;
    if (this.isInitializing || this.loadFailed) return;
    this.isInitializing = true;
    try {
      // The model.json will be located in the public/model folder
      this.model = await tf.loadLayersModel('/model/model.json');
      console.log('TensorFlow.js Edge AI Model loaded successfully');
      
      // Warm up the model
      const dummyInput = tf.zeros([1, 30, 99]);
      this.model.predict(dummyInput);
      dummyInput.dispose();
      
    } catch (err) {
      console.error('Failed to load TensorFlow.js model. Falling back to simple heuristic processing.', err);
      this.loadFailed = true; // Prevent infinite retries and browser freezing
    } finally {
      this.isInitializing = false;
    }
  }

  // Safe extraction of landmarks
  private getLMData(lm: any): [number, number, number] {
    if (lm && typeof lm.x === 'number') {
      return [lm.x, lm.y, lm.visibility || 0.0];
    }
    return [0.0, 0.0, 0.0];
  }

  private flattenAndImputeFrame(frameLandmarks: any[]): number[] {
    if (!frameLandmarks || frameLandmarks.length < 33) {
      return new Array(99).fill(0.0);
    }

    // Left and Right Shoulders
    const [ls_x, ls_y, ls_v] = this.getLMData(frameLandmarks[11]);
    const [rs_x, rs_y, rs_v] = this.getLMData(frameLandmarks[12]);

    let shoulder_width = 0.20;
    if (ls_v > 0.5 && rs_v > 0.5) {
      shoulder_width = Math.sqrt(Math.pow(rs_x - ls_x, 2) + Math.pow(rs_y - ls_y, 2));
    }

    // Check visibility of key lower-body joints: Hips (23, 24), Knees (25, 26), Ankles (27, 28)
    const lower_body_indices = [23, 24, 25, 26, 27, 28];
    let lowVisibilityCount = 0;
    for (const idx of lower_body_indices) {
      if (this.getLMData(frameLandmarks[idx])[2] < 0.5) {
        lowVisibilityCount++;
      }
    }

    // Create a mutable copy of the exact landmarks
    const imputedFrame = [...frameLandmarks];

    // Impute if lower body is mostly occluded
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

    // Flatten to 99 elements
    const features: number[] = [];
    for (let i = 0; i < 33; i++) {
      const [x, y, v] = this.getLMData(imputedFrame[i]);
      features.push(x, y, v);
    }
    return features;
  }

  async predictExercise(landmarksBuffer: any[][], selectedExercise?: string) {
    if (!this.model) {
      await this.loadModel();
    }
    
    if (!this.model) {
      return { exercise: "unknown", confidence: 0, phase: 'N/A', rep_count: 0, joint_angles: [], timestamp: new Date().toISOString() };
    }

    // We need exactly 30 frames
    let sequence = [...landmarksBuffer];
    if (sequence.length === 0) {
      return { exercise: "unknown", confidence: 0, phase: 'N/A', rep_count: 0, joint_angles: [], timestamp: new Date().toISOString() };
    }
    
    // Pad or truncate to 30 frames
    while (sequence.length < 30) {
      sequence.unshift(sequence[0]); // Pad with the oldest frame
    }
    if (sequence.length > 30) {
      sequence = sequence.slice(sequence.length - 30);
    }

    // Process all 30 frames
    const processedSequence = sequence.map(frame => this.flattenAndImputeFrame(frame));

    return tf.tidy(() => {
      // Create tensor of shape [1, 30, 99]
      const inputTensor = tf.tensor3d([processedSequence]);
      
      // Execute inference
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      const scores = prediction.dataSync();
      
      // Find the highest confidence class
      let maxConfidence = 0;
      let maxIndex = 0;
      
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxConfidence) {
          maxConfidence = scores[i];
          maxIndex = i;
        }
      }
      
      const predictedExercise = EXERCISES[maxIndex];

      return {
        exercise: predictedExercise,
        confidence: maxConfidence,
        phase: 'N/A',
        rep_count: 0,
        joint_angles: [],
        timestamp: new Date().toISOString()
      };
    });
  }
}

export const tfjsService = new TFJSService();
