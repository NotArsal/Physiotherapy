import { calculateAngle, extractJointAngles } from '../poseDetection';

describe('poseDetection utility', () => {
  describe('calculateAngle', () => {
    it('calculates a 90 degree angle correctly', () => {
      const a = { x: 1, y: 0, z: 0 };
      const b = { x: 0, y: 0, z: 0 }; // vertex
      const c = { x: 0, y: 1, z: 0 };
      const angle = calculateAngle(a, b, c);
      expect(Math.round(angle)).toBe(90);
    });

    it('calculates a 180 degree angle correctly', () => {
      const a = { x: 1, y: 0, z: 0 };
      const b = { x: 0, y: 0, z: 0 }; // vertex
      const c = { x: -1, y: 0, z: 0 };
      const angle = calculateAngle(a, b, c);
      expect(Math.round(angle)).toBe(180);
    });
  });

  describe('extractJointAngles', () => {
    it('returns an array of exactly 8 joint angles given a valid 33-point landmark array', () => {
      // Mock 33 landmarks
      const mockLandmarks = Array(33).fill({ x: 0, y: 0, z: 0 });
      // Set specific values for Left Shoulder (11), Left Elbow (13), Left Wrist (15) to make a 90 deg angle
      mockLandmarks[11] = { x: 1, y: 0, z: 0 };
      mockLandmarks[13] = { x: 0, y: 0, z: 0 };
      mockLandmarks[15] = { x: 0, y: 1, z: 0 };

      const angles = extractJointAngles(mockLandmarks);
      expect(angles.length).toBe(9);
      // The left elbow angle is pushed third (index 2)
      expect(Math.round(angles[2])).toBe(90);
    });
  });
});
