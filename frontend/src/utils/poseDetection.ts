import { Pose } from '@mediapipe/pose';
import { ExerciseProtocol } from '../services/api';

export interface JointAngles {
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  spine: number;
}

// Calculate angle between three points
function calculateAngle(point1: any, point2: any, point3: any): number {
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y
  };
  
  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y
  };
  
  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  
  return (angle * 180) / Math.PI;
}

// Extract joint angles from MediaPipe pose landmarks
export function extractJointAngles(landmarks: any): number[] {
  if (!landmarks || landmarks.length < 33) {
    return Array(9).fill(0);
  }
  
  try {
    // MediaPipe Pose landmark indices
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    const angles = [];
    
    // Left shoulder angle (hip-shoulder-elbow)
    angles.push(calculateAngle(leftHip, leftShoulder, leftElbow));
    
    // Right shoulder angle (hip-shoulder-elbow)
    angles.push(calculateAngle(rightHip, rightShoulder, rightElbow));
    
    // Left elbow angle (shoulder-elbow-wrist)
    angles.push(calculateAngle(leftShoulder, leftElbow, leftWrist));
    
    // Right elbow angle (shoulder-elbow-wrist)
    angles.push(calculateAngle(rightShoulder, rightElbow, rightWrist));
    
    // Left hip angle (shoulder-hip-knee)
    angles.push(calculateAngle(leftShoulder, leftHip, leftKnee));
    
    // Right hip angle (shoulder-hip-knee)
    angles.push(calculateAngle(rightShoulder, rightHip, rightKnee));
    
    // Left knee angle (hip-knee-ankle)
    angles.push(calculateAngle(leftHip, leftKnee, leftAnkle));
    
    // Right knee angle (hip-knee-ankle)
    angles.push(calculateAngle(rightHip, rightKnee, rightAnkle));
    
    // Spine angle (approximation)
    // Measures the inclination of the torso relative to a vertical axis
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    // Create a virtual vertical reference directly above the shoulder midpoint
    const verticalRef = {
      x: shoulderMidpoint.x,
      y: shoulderMidpoint.y - 1.0 // Extend further for better vector stability
    };
    
    angles.push(calculateAngle(verticalRef, shoulderMidpoint, hipMidpoint));
    
    return angles;
  } catch (error) {
    console.error('Error calculating joint angles:', error);
    return Array(9).fill(0);
  }
}

// Initialize MediaPipe Pose with CDN-hosted assets and asset loading watchdog support.
export function initializePoseDetection(
  onResults: (results: any) => void,
  onTimeout?: () => void
): { pose: Pose; startWatchdog: () => void; clearWatchdog: () => void } {
  let hasReceivedResults = false;
  let timerId: any = null;

  const pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
  });
  
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  
  pose.onResults((results) => {
    hasReceivedResults = true;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    onResults(results);
  });

  const startWatchdog = () => {
    hasReceivedResults = false;
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      if (!hasReceivedResults && onTimeout) {
        onTimeout();
      }
    }, 15000); // 15-second download watchdog threshold
  };

  const clearWatchdog = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return { pose, startWatchdog, clearWatchdog };
}

// Voice feedback messages
interface VoiceFeedback {
  goodRep: string[];
  improveForm: string[];
  encouragement: string[];
  exerciseSpecific: { [key: string]: string[] };
}

export const voiceFeedback: VoiceFeedback = {
  goodRep: [
    "Great job!",
    "Perfect form!",
    "Excellent rep!",
    "Keep it up!",
    "Nice work!",
    "Outstanding!",
    "Well done!",
    "Strong rep!"
  ],
  improveForm: [
    "Keep your back straight",
    "Control the movement",
    "Slower tempo",
    "Focus on form",
    "Full range of motion",
    "Engage your core",
    "Breathe properly",
    "Maintain posture"
  ],
  encouragement: [
    "You're doing great!",
    "Almost there!",
    "Keep going!",
    "Stay strong!",
    "Push through!",
    "You've got this!",
    "Don't give up!",
    "One more rep!"
  ],
  // Exercise-specific feedback
  exerciseSpecific: {
    'bench_press': [
      "Lower the bar to your chest",
      "Press up explosively",
      "Keep your feet planted",
      "Squeeze your shoulder blades"
    ],
    'squat': [
      "Go deeper",
      "Knees out",
      "Drive through your heels",
      "Keep your chest up"
    ],
    'deadlift': [
      "Straight back",
      "Drive with your hips",
      "Squeeze your glutes",
      "Keep the bar close"
    ],
    'push_up': [
      "Lower to your chest",
      "Keep your body straight",
      "Push up strong",
      "Don't let your hips sag"
    ],
    'pull_up': [
      "Pull your chest to the bar",
      "Control the descent",
      "Engage your lats",
      "Full range of motion"
    ],
    'shoulder_press': [
      "Press overhead",
      "Keep your core tight",
      "Don't arch your back",
      "Control the weight"
    ],
    'biceps_curl': [
      "Squeeze your biceps",
      "Control the negative",
      "Don't swing the weight",
      "Full extension"
    ],
    'tricep_dips': [
      "Lower until elbows are 90 degrees",
      "Press up strong",
      "Keep your body upright",
      "Don't flare your elbows"
    ],
    'plank': [
      "Hold strong",
      "Keep your core tight",
      "Breathe steadily",
      "Maintain the position"
    ],
    'russian_twist': [
      "Rotate fully",
      "Keep your core engaged",
      "Control the movement",
      "Touch the ground"
    ],
    'lat_pulldown': [
      "Pull to your upper chest",
      "Squeeze your lats",
      "Control the weight up",
      "Keep your torso upright"
    ],
    'leg_extension': [
      "Extend fully",
      "Squeeze your quads",
      "Control the descent",
      "Don't swing your legs"
    ],
    'leg_raises': [
      "Raise your legs up",
      "Keep them straight",
      "Control the descent",
      "Engage your lower abs"
    ],
    'hip_thrust': [
      "Drive your hips up",
      "Squeeze your glutes",
      "Keep your core tight",
      "Full hip extension"
    ],
    'romanian_deadlift': [
      "Push your hips back",
      "Feel the stretch in your hamstrings",
      "Drive your hips forward",
      "Keep the bar close"
    ],
    'lateral_raise': [
      "Raise to shoulder height",
      "Control the descent",
      "Don't use momentum",
      "Feel it in your delts"
    ],
    'hammer_curl': [
      "Keep your wrists straight",
      "Squeeze at the top",
      "Control the negative",
      "Don't swing"
    ],
    't_bar_row': [
      "Pull to your lower chest",
      "Squeeze your shoulder blades",
      "Keep your back straight",
      "Control the weight"
    ],
    'tricep_pushdown': [
      "Push down fully",
      "Keep your elbows at your sides",
      "Squeeze your triceps",
      "Control the weight up"
    ],
    'chest_fly_machine': [
      "Squeeze your pecs together",
      "Control the stretch",
      "Keep a slight bend in your elbows",
      "Feel the chest contraction"
    ],
    'incline_bench_press': [
      "Press up and slightly back",
      "Keep your shoulders down",
      "Focus on your upper chest",
      "Control the descent"
    ],
    'decline_bench_press': [
      "Press straight up",
      "Focus on your lower chest",
      "Keep your core engaged",
      "Full range of motion"
    ],
    'glute_bridge': [
      "Squeeze your glutes at the top",
      "Keep your neck relaxed",
      "Drive through your heels",
      "Don't hyperextend your lower back"
    ],
    'clamshell': [
      "Keep your feet glued together",
      "Don't roll your hips backward",
      "Squeeze your outer glute",
      "Control the lowering phase"
    ],
    'bird_dog': [
      "Keep your spine neutral",
      "Extend your arm and leg straight out",
      "Engage your abdominal wall",
      "Avoid lifting your leg too high"
    ],
    'wall_slide': [
      "Keep your lower back flat against the wall",
      "Keep your elbows and wrists in contact",
      "Slide up slowly",
      "Control the descent and squeeze"
    ],
    'straight_leg_raise': [
      "Lock your knee straight",
      "Lifting only to 45 degrees",
      "Keep your core activated",
      "Lower slowly and repeat"
    ]
  }
};

// Text-to-speech function
export function speak(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  }
}

// Get random voice feedback
export function getRandomFeedback(type: 'goodRep' | 'improveForm' | 'encouragement'): string {
  const messages = voiceFeedback[type] as string[];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Get exercise-specific feedback
export function getExerciseSpecificFeedback(exercise: string): string {
  const exerciseKey = exercise.toLowerCase().replace(/[-_]/g, '_');
  
  // Try to match exercise-specific feedback
  if (voiceFeedback.exerciseSpecific[exerciseKey]) {
    const messages = voiceFeedback.exerciseSpecific[exerciseKey];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Try partial matches for compound exercise names
  for (const [key, messages] of Object.entries(voiceFeedback.exerciseSpecific)) {
    if (exerciseKey.includes(key) || key.includes(exerciseKey)) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }
  
  // Fall back to general form feedback
  return getRandomFeedback('improveForm');
}

// Get milestone feedback based on rep count
export function getMilestoneFeedback(repCount: number): string {
  if (repCount === 1) return "First rep complete!";
  if (repCount === 5) return "Halfway there!";
  if (repCount === 10) return "Great work, ten reps!";
  if (repCount === 15) return "Fifteen reps strong!";
  if (repCount === 20) return "Twenty reps! You're on fire!";
  if (repCount % 10 === 0) return `${repCount} reps completed!`;
  if (repCount % 5 === 0) return `${repCount} reps down!`;
  
  return getRandomFeedback('encouragement');
}

/**
 * Normalizes exercise names for consistent comparison
 */
export function normalizeExerciseName(exerciseName: string | null | undefined): string {
  if (!exerciseName) return "";
  return String(exerciseName).trim().toLowerCase().replace(/-/g, "_").replace(/ /g, "_");
}

/**
 * Detects the current phase of an exercise based on joint angles.
 * Returns the new phase ('up', 'down', or 'hold').
 * Uses hysteresis (High/Low thresholds) to prevent flickering and improve rep counting.
 */
export function detectExercisePhase(
  jointAngles: number[], 
  exercise: string, 
  previousPhase: string = 'down'
): string {
  if (!jointAngles || jointAngles.length < 9) return previousPhase;

  const shoulderAngle = jointAngles[0]; // Left shoulder (Hip-Shoulder-Elbow)
  const elbowAngle = jointAngles[2];    // Left elbow (Shoulder-Elbow-Wrist)
  const hipAngle = jointAngles[4];      // Left hip (Shoulder-Hip-Knee)
  const kneeAngle = jointAngles[6];     // Left knee (Hip-Knee-Ankle)

  const exerciseKey = normalizeExerciseName(exercise);
  let newPhase = previousPhase;

  // Hysteresis logic: Requires crossing a significantly different threshold to change phase.
  // This prevents flickering near a single threshold point.
  
  if (["bench_press", "incline_bench_press", "decline_bench_press", "push_up"].includes(exerciseKey)) {
    // Going Down: Angle decreases | Going Up: Angle increases
    if (elbowAngle < 90) newPhase = "down";
    else if (elbowAngle > 140) newPhase = "up";
  } else if (["barbell_biceps_curl", "hammer_curl", "biceps_curl"].includes(exerciseKey)) {
    // Concentric (curled up): elbow angle decreases below 65
    // Eccentric (extended down): elbow angle increases above 145
    if (elbowAngle < 65) newPhase = "up";
    else if (elbowAngle > 145) newPhase = "down";
  } else if (["tricep_dips", "tricep_pushdown"].includes(exerciseKey)) {
    if (elbowAngle < 90) newPhase = "down";
    else if (elbowAngle > 140) newPhase = "up";
  } else if (exerciseKey === "shoulder_press") {
    if (shoulderAngle < 80) newPhase = "down";
    else if (shoulderAngle > 150) newPhase = "up";
  } else if (exerciseKey === "lateral_raise") {
    if (shoulderAngle < 35) newPhase = "down";
    else if (shoulderAngle > 85) newPhase = "up";
  } else if (["squat", "leg_extension"].includes(exerciseKey)) {
    if (kneeAngle < 100) newPhase = "down";
    else if (kneeAngle > 150) newPhase = "up";
  } else if (["deadlift", "romanian_deadlift"].includes(exerciseKey)) {
    if (hipAngle < 125) newPhase = "down";
    else if (hipAngle > 165) newPhase = "up";
  } else if (exerciseKey === "hip_thrust") {
    if (hipAngle < 115) newPhase = "down";
    else if (hipAngle > 155) newPhase = "up";
  } else if (exerciseKey === "leg_raises") {
    if (hipAngle > 160) newPhase = "down";
    else if (hipAngle < 110) newPhase = "up";
  } else if (exerciseKey === "glute_bridge") {
    if (hipAngle < 125) newPhase = "down";
    else if (hipAngle > 160) newPhase = "up";
  } else if (exerciseKey === "clamshell") {
    if (hipAngle < 115) newPhase = "down";
    else if (hipAngle > 135) newPhase = "up";
  } else if (exerciseKey === "bird_dog") {
    if (shoulderAngle < 100) newPhase = "down";
    else if (shoulderAngle > 145) newPhase = "up";
  } else if (exerciseKey === "wall_slide") {
    if (shoulderAngle < 95) newPhase = "down";
    else if (shoulderAngle > 145) newPhase = "up";
  } else if (exerciseKey === "straight_leg_raise") {
    if (hipAngle > 165) newPhase = "down";
    else if (hipAngle < 135) newPhase = "up";
  } else if (["pull_up", "lat_pulldown", "t_bar_row"].includes(exerciseKey)) {
    if (elbowAngle > 150) newPhase = "down";
    else if (elbowAngle < 80) newPhase = "up";
  } else if (exerciseKey === "russian_twist") {
    if (shoulderAngle < 75) newPhase = "down";
    else if (shoulderAngle > 110) newPhase = "up";
  } else if (exerciseKey === "plank") {
    newPhase = "hold";
  } else if (exerciseKey === "chest_fly_machine") {
    if (shoulderAngle > 130) newPhase = "down";
    else if (shoulderAngle < 80) newPhase = "up";
  } else {
    // Default fallback
    if (shoulderAngle < 90) newPhase = "down";
    else if (shoulderAngle > 140) newPhase = "up";
  }

  return newPhase;
}

export interface InjuryRiskReport {
  isSafe: boolean;
  riskScore: number; // 0 to 100
  warnings: string[];
  metrics: {
    spineAngle: number;
    kneeValgusRatio: number;
    dropVelocity: number;
    shoulderTilt: number;
  };
}

export function detectInjuryRisk(
  landmarks: any,
  jointAngles: number[],
  exerciseName: string,
  protocol?: ExerciseProtocol | null,
  previousLandmarks?: any,
  deltaTime?: number // in seconds
): InjuryRiskReport {
  const report: InjuryRiskReport = {
    isSafe: true,
    riskScore: 0,
    warnings: [],
    metrics: {
      spineAngle: jointAngles[8] || 0,
      kneeValgusRatio: 1.0,
      dropVelocity: 0,
      shoulderTilt: 0
    }
  };

  if (!landmarks || landmarks.length < 33) return report;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];

  const exerciseKey = normalizeExerciseName(exerciseName);
  const sensitivity = protocol?.safety_sensitivity || 'medium';

  // 0. Joint Visibility and Camera Calibration Warnings
  const visibilityThreshold = 0.45;
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const isUpperBody = [
    "lat_pulldown", "pull_up", "shoulder_press", "wall_slide", 
    "biceps_curl", "barbell_biceps_curl", "hammer_curl", "lateral_raise",
    "bench_press", "incline_bench_press", "decline_bench_press", 
    "chest_fly_machine", "tricep_dips", "tricep_pushdown"
  ].includes(exerciseKey);
  const isLowerBody = [
    "squat", "deadlift", "romanian_deadlift", "hip_thrust", 
    "glute_bridge", "straight_leg_raise", "leg_raises", "clamshell",
    "leg_extension"
  ].includes(exerciseKey);
  const isFullBody = [
    "push_up", "plank", "bird_dog", "russian_twist", "t_bar_row"
  ].includes(exerciseKey);

  if (isUpperBody) {
    const wristsMissing = (!leftWrist || leftWrist.visibility < visibilityThreshold) || (!rightWrist || rightWrist.visibility < visibilityThreshold);
    const elbowsMissing = (!leftElbow || leftElbow.visibility < visibilityThreshold) || (!rightElbow || rightElbow.visibility < visibilityThreshold);
    if (wristsMissing) {
      report.warnings.push("Hands not visible! Adjust camera to show your hands.");
      report.isSafe = false;
      report.riskScore = Math.max(report.riskScore, 65);
    } else if (elbowsMissing) {
      report.warnings.push("Arms not visible! Adjust camera to show your elbows.");
      report.isSafe = false;
      report.riskScore = Math.max(report.riskScore, 55);
    }
  } else if (isLowerBody) {
    const kneesMissing = (!leftKnee || leftKnee.visibility < visibilityThreshold) || (!rightKnee || rightKnee.visibility < visibilityThreshold);
    const anklesMissing = (!leftAnkle || leftAnkle.visibility < visibilityThreshold) || (!rightAnkle || rightAnkle.visibility < visibilityThreshold);
    if (kneesMissing || anklesMissing) {
      report.warnings.push("Legs not visible! Step back so your legs are in frame.");
      report.isSafe = false;
      report.riskScore = Math.max(report.riskScore, 65);
    }
  } else if (isFullBody) {
    const elbowsMissing = (!leftElbow || leftElbow.visibility < visibilityThreshold) || (!rightElbow || rightElbow.visibility < visibilityThreshold);
    const hipsMissing = (!leftHip || leftHip.visibility < visibilityThreshold) || (!rightHip || rightHip.visibility < visibilityThreshold);
    const kneesMissing = (!leftKnee || leftKnee.visibility < visibilityThreshold) || (!rightKnee || rightKnee.visibility < visibilityThreshold);
    if (elbowsMissing || hipsMissing || kneesMissing) {
      report.warnings.push("Full body not visible! Step back to show your entire body.");
      report.isSafe = false;
      report.riskScore = Math.max(report.riskScore, 65);
    }
  }

  // 1. Spine Flexion Analysis
  // High spine angle relative to gravity = torso bending forward.
  // Rounded backs are dangerous in Squat, Deadlift, Push-ups, and Plank.
  const spineAngle = jointAngles[8] || 0;
  const maxSafeSpine = protocol?.safe_spine_angle ?? 30.0;
  let spineRisk = 0;
  
  if (["squat", "deadlift", "push_up", "plank", "barbell_biceps_curl", "shoulder_press", "glute_bridge", "bird_dog", "wall_slide"].includes(exerciseKey)) {
    if (spineAngle > maxSafeSpine) {
      spineRisk = Math.min(100, ((spineAngle - maxSafeSpine) / 15) * 50 + 50);
      report.warnings.push("Rounded Back! Keep your spine neutral.");
    }
  }

  // 1b. Straight Leg Raise - Knee Flexion Analysis
  let legRaiseKneeRisk = 0;
  if (exerciseKey === "straight_leg_raise") {
    const kneeAngle = Math.min(jointAngles[6] || 180, jointAngles[7] || 180);
    if (kneeAngle < 155) {
      legRaiseKneeRisk = Math.min(100, ((155 - kneeAngle) / 20) * 50 + 50);
      report.warnings.push("Knee Bending! Keep your raised leg completely straight.");
    }
  }

  // 1c. Therapist Knee Flexion Depth Analysis
  // For lower-body exercises, check if knee angle bends deeper (goes below) the safe_knee_angle limit.
  const safeKneeAngle = protocol?.safe_knee_angle ?? 90.0;
  let kneeFlexionRisk = 0;

  if (isLowerBody && ["squat", "leg_extension"].includes(exerciseKey)) {
    const kneeAngle = Math.min(jointAngles[6] || 180, jointAngles[7] || 180);
    if (kneeAngle < safeKneeAngle) {
      kneeFlexionRisk = Math.min(100, ((safeKneeAngle - kneeAngle) / 20) * 50 + 50);
      report.warnings.push(`Knee Too Deep! Keep knee angle above ${safeKneeAngle}°.`);
    }
  }

  // 2. Knee Valgus Collapse Analysis (Knees caving inwards)
  let kneeValgusRisk = 0;
  if (leftHip && rightHip && leftKnee && rightKnee) {
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
    if (hipWidth > 0) {
      const kneeValgusRatio = kneeWidth / hipWidth;
      report.metrics.kneeValgusRatio = kneeValgusRatio;
      
      let valgusThreshold = 0.82; // medium
      if (sensitivity === 'high') valgusThreshold = 0.90;
      else if (sensitivity === 'low') valgusThreshold = 0.75;
      
      if (kneeValgusRatio < valgusThreshold && ["squat", "deadlift"].includes(exerciseKey)) {
        kneeValgusRisk = Math.min(100, ((valgusThreshold - kneeValgusRatio) / 0.15) * 50 + 50);
        report.warnings.push("Knees Caving In! Keep knees aligned.");
      }
    }
  }

  // 3. Drop Velocity Analysis (Uncontrolled descent)
  let velocityRisk = 0;
  if (previousLandmarks && previousLandmarks.length >= 33 && deltaTime && deltaTime > 0) {
    const currentHipY = (leftHip.y + rightHip.y) / 2;
    const prevLeftHip = previousLandmarks[23];
    const prevRightHip = previousLandmarks[24];
    const prevHipY = (prevLeftHip.y + prevRightHip.y) / 2;
    
    // y coordinate increases as user moves down the frame
    const dy = currentHipY - prevHipY;
    const dropVelocity = dy / deltaTime; // unit screen percentage per second
    report.metrics.dropVelocity = dropVelocity;
    
    let maxSafeVelocity = 1.5; // medium
    if (sensitivity === 'high') maxSafeVelocity = 1.0;
    else if (sensitivity === 'low') maxSafeVelocity = 2.0;
    
    if (dropVelocity > maxSafeVelocity && ["squat", "deadlift"].includes(exerciseKey)) {
      velocityRisk = Math.min(100, ((dropVelocity - maxSafeVelocity) / 1.0) * 50 + 50);
      report.warnings.push("Dropping Too Fast! Control your descent.");
    }
  }

  // 4. Shoulder Asymmetry / Barbell Tilt Analysis
  let asymmetryRisk = 0;
  if (leftShoulder && rightShoulder) {
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    if (shoulderWidth > 0) {
      const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth;
      report.metrics.shoulderTilt = shoulderTilt;
      
      if (shoulderTilt > 0.15 && ["squat", "deadlift", "shoulder_press", "barbell_biceps_curl"].includes(exerciseKey)) {
        asymmetryRisk = Math.min(100, ((shoulderTilt - 0.15) / 0.1) * 50 + 50);
        report.warnings.push("Asymmetrical Shoulders! Keep shoulders level.");
      }
    }
  }

  // 5. Forward Head Posture / Neck Strain / Slouching Analysis
  let headPostureRisk = 0;
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const nose = landmarks[0];

  if (leftEar && rightEar && leftShoulder && rightShoulder && nose) {
    const earMidX = (leftEar.x + rightEar.x) / 2;
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) || 0.2;

    // Horizontal offset of head from shoulder alignment indicates forward carriage
    const forwardHeadRatio = Math.abs(earMidX - shoulderMidX) / shoulderWidth;

    // Vertical alignment relative to body scale indicates slouching/collapse
    const headDropRatio = (shoulderMidY - nose.y) / shoulderWidth;

    // Active triggers for posture-sensitive exercises
    if (forwardHeadRatio > 0.40 && ["wall_slide", "shoulder_press", "plank", "bird_dog"].includes(exerciseKey)) {
      headPostureRisk = Math.min(100, ((forwardHeadRatio - 0.40) / 0.2) * 50 + 50);
      report.warnings.push("Forward Head! Align your neck and tuck your chin.");
    } else if (headDropRatio < 0.35 && ["wall_slide", "shoulder_press", "barbell_biceps_curl", "hammer_curl"].includes(exerciseKey)) {
      headPostureRisk = Math.min(100, ((0.35 - headDropRatio) / 0.15) * 50 + 50);
      report.warnings.push("Slouching! Pull your shoulders back and stand tall.");
    }
  }

  // 6. Detailed Exercise-Specific Form Corrections (ROM, Alignment, Cheating)
  let exerciseCorrectionRisk = 0;

  // A. Biceps Curls: Detect elbow swing or cheating
  if (["barbell_biceps_curl", "hammer_curl", "biceps_curl"].includes(exerciseKey)) {
    const leftShoulderAngle = jointAngles[0] || 0;
    const rightShoulderAngle = jointAngles[1] || 0;
    const maxShoulderAngle = Math.max(leftShoulderAngle, rightShoulderAngle);
    
    // If shoulders engage and elbows swing forward too much
    if (maxShoulderAngle > 40) {
      exerciseCorrectionRisk = Math.max(exerciseCorrectionRisk, Math.min(100, ((maxShoulderAngle - 40) / 20) * 50 + 50));
      report.warnings.push("Elbow Swing! Keep elbows locked at your sides.");
    }
  }

  // B. Shoulder Press / Overhead Press: Flared shoulders / asymmetric press
  if (["shoulder_press", "wall_slide"].includes(exerciseKey)) {
    const leftElbowAngle = jointAngles[2] || 0;
    const rightElbowAngle = jointAngles[3] || 0;
    const leftShoulderAngle = jointAngles[0] || 0;
    const rightShoulderAngle = jointAngles[1] || 0;

    // Detect asymmetric arm extensions
    const armAsymmetry = Math.abs(leftElbowAngle - rightElbowAngle);
    if (armAsymmetry > 25 && Math.max(leftShoulderAngle, rightShoulderAngle) > 90) {
      exerciseCorrectionRisk = Math.max(exerciseCorrectionRisk, Math.min(100, ((armAsymmetry - 25) / 20) * 50 + 50));
      report.warnings.push("Asymmetric Press! Press both arms evenly.");
    }

    // Detect incomplete extension overhead (doing half-reps)
    if (Math.max(leftShoulderAngle, rightShoulderAngle) > 110 && Math.min(leftElbowAngle, rightElbowAngle) < 130) {
      exerciseCorrectionRisk = Math.max(exerciseCorrectionRisk, 60);
      report.warnings.push("Incomplete Press! Extend arms fully overhead.");
    }
  }

  // C. Push Ups & Bench Press: Elbow flaring (putting high stress on shoulders)
  if (["push_up", "bench_press", "incline_bench_press", "decline_bench_press"].includes(exerciseKey)) {
    const leftShoulderAngle = jointAngles[0] || 0;
    const rightShoulderAngle = jointAngles[1] || 0;
    const maxShoulderAngle = Math.max(leftShoulderAngle, rightShoulderAngle);

    if (maxShoulderAngle > 85) {
      exerciseCorrectionRisk = Math.max(exerciseCorrectionRisk, Math.min(100, ((maxShoulderAngle - 85) / 15) * 50 + 50));
      report.warnings.push("Elbow Flare! Tuck elbows to 45-70 degrees.");
    }
  }

  // D. Straight Leg Raise: Leg raised too high (back strain)
  if (exerciseKey === "straight_leg_raise") {
    const leftHipAngle = jointAngles[4] || 180;
    const rightHipAngle = jointAngles[5] || 180;
    const minHipAngle = Math.min(leftHipAngle, rightHipAngle);

    if (minHipAngle < 125) {
      exerciseCorrectionRisk = Math.max(exerciseCorrectionRisk, Math.min(100, ((125 - minHipAngle) / 20) * 50 + 50));
      report.warnings.push("Leg Too High! Keep below 45 degrees.");
    }
  }

  // E. Glute Bridge: Arching lower back excessively (hyperextension)
  if (exerciseKey === "glute_bridge") {
    const spineAngle = jointAngles[8] || 0;
    if (spineAngle > 25) {
      exerciseCorrectionRisk = Math.max(exerciseCorrectionRisk, Math.min(100, ((spineAngle - 25) / 15) * 50 + 50));
      report.warnings.push("Hyperextended Back! Engage glutes and core.");
    }
  }

  // F. Bird Dog: Hyperextending leg upwards
  if (exerciseKey === "bird_dog") {
    const leftHipAngle = jointAngles[4] || 180;
    const rightHipAngle = jointAngles[5] || 180;
    const maxHipAngle = Math.max(leftHipAngle, rightHipAngle);
    
    if (maxHipAngle > 175 && leftHip && rightHip && leftShoulder && rightShoulder && (leftHip.y < leftShoulder.y || rightHip.y < rightShoulder.y)) {
      exerciseCorrectionRisk = Math.max(exerciseCorrectionRisk, 65);
      report.warnings.push("Leg Too High! Keep leg horizontal to the floor.");
    }
  }

  // Calculate aggregate risk score
  const maxRisk = Math.max(
    spineRisk, 
    kneeValgusRisk, 
    velocityRisk, 
    asymmetryRisk, 
    legRaiseKneeRisk, 
    kneeFlexionRisk,
    headPostureRisk,
    exerciseCorrectionRisk
  );
  report.riskScore = Math.round(maxRisk);
  
  if (report.riskScore > 50) {
    report.isSafe = false;
  }

  return report;
}

