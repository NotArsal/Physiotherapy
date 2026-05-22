import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, IconButton, Button } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// ─── Exercise demo database ───────────────────────────────────────────────────
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

interface ExerciseDemo {
  images: string[];
  description: string;
  muscles: string[];
  tips: string[];
  category: string;
  cameraHint: string;
}

export const EXERCISE_DEMOS: Record<string, ExerciseDemo> = {
  bench_press: {
    images: [`${BASE}/Barbell%20Bench%20Press/0.jpg`, `${BASE}/Barbell%20Bench%20Press/1.jpg`],
    description: 'Lie on a flat bench, grip the barbell slightly wider than shoulder-width, lower it to your chest, then press back up.',
    muscles: ['Chest (Pectoralis Major)', 'Front Deltoids', 'Triceps'],
    tips: ['Retract shoulder blades before lifting', 'Keep feet flat on the floor', 'Lower bar to mid-chest', 'Press in a slight arc'],
    category: 'Chest · Strength',
    cameraHint: 'Position camera to the side so your arms are fully visible',
  },
  incline_bench_press: {
    images: [`${BASE}/Barbell%20Incline%20Bench%20Press/0.jpg`, `${BASE}/Barbell%20Incline%20Bench%20Press/1.jpg`],
    description: 'Performed on a bench set to 30–45°, this targets the upper chest. Press the bar up and slightly back.',
    muscles: ['Upper Chest', 'Front Deltoids', 'Triceps'],
    tips: ['Set bench to 30–45 degrees', 'Keep wrists straight', 'Lower to upper chest', 'Avoid excessive arch'],
    category: 'Chest · Strength',
    cameraHint: 'Side camera angle works best to see the incline range of motion',
  },
  decline_bench_press: {
    images: [`${BASE}/Barbell%20Decline%20Bench%20Press/0.jpg`, `${BASE}/Barbell%20Decline%20Bench%20Press/1.jpg`],
    description: 'On a decline bench, press the barbell upward from your lower chest. Focuses on the lower pectorals.',
    muscles: ['Lower Chest', 'Triceps', 'Front Deltoids'],
    tips: ['Secure feet on the pad', 'Keep elbows at 45–75 degrees', 'Full range of motion', 'Control the descent'],
    category: 'Chest · Strength',
    cameraHint: 'Side camera so your full arm path is visible',
  },
  push_up: {
    images: [`${BASE}/Push-Up/0.jpg`, `${BASE}/Push-Up/1.jpg`],
    description: 'A bodyweight pushing exercise. Start in a plank, lower your chest to the floor, then push back up.',
    muscles: ['Chest', 'Triceps', 'Front Deltoids', 'Core'],
    tips: ['Keep body in a straight line', 'Lower chest to near the floor', 'Elbows at 45° to body', 'Engage core throughout'],
    category: 'Chest · Bodyweight',
    cameraHint: 'Place camera at floor level from the side to see full body alignment',
  },
  chest_fly_machine: {
    images: [`${BASE}/Butterfly/0.jpg`, `${BASE}/Butterfly/1.jpg`],
    description: 'Sit in the fly machine, set handles at chest level, and bring both arms together in a hugging motion.',
    muscles: ['Chest (Pectoralis Major)', 'Front Deltoids'],
    tips: ['Slight bend in elbows throughout', 'Squeeze chest at the center', 'Control the stretch outward', 'Keep back against the pad'],
    category: 'Chest · Machine',
    cameraHint: 'Front or 45° angle so the arm arc motion is visible',
  },
  squat: {
    images: [`${BASE}/Barbell%20Full%20Squat/0.jpg`, `${BASE}/Barbell%20Full%20Squat/1.jpg`],
    description: 'Stand with feet shoulder-width apart, drive hips back and down until thighs are parallel, then stand back up.',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    tips: ['Knees track over toes', 'Chest stays upright', 'Drive through heels', 'Go to at least parallel depth'],
    category: 'Legs · Compound',
    cameraHint: 'Full-body shot from the side — knees AND ankles must be visible',
  },
  deadlift: {
    images: [`${BASE}/Barbell%20Deadlift/0.jpg`, `${BASE}/Barbell%20Deadlift/1.jpg`],
    description: 'Hinge at the hips, grip the bar, brace your core and drive through your legs to stand up tall.',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back', 'Traps', 'Core'],
    tips: ['Bar stays close to body', 'Neutral spine throughout', 'Drive hips forward at top', 'Brace core before pulling'],
    category: 'Back · Compound',
    cameraHint: 'Side or 45° angle — full body from head to feet must be visible',
  },
  romanian_deadlift: {
    images: [`${BASE}/Romanian%20Deadlift/0.jpg`, `${BASE}/Romanian%20Deadlift/1.jpg`],
    description: 'Keep legs nearly straight, hinge forward pushing hips back, feeling a deep hamstring stretch, then drive hips forward.',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    tips: ['Maintain slight knee bend', 'Feel the hamstring stretch', 'Bar stays close to legs', 'Drive hips forward to stand'],
    category: 'Legs · Hinge',
    cameraHint: 'Side camera — full body visible from head to feet',
  },
  pull_up: {
    images: [`${BASE}/Pull-up/0.jpg`, `${BASE}/Pull-up/1.jpg`],
    description: 'Hang from a bar with overhand grip, pull your chest to the bar by driving elbows down, then lower with control.',
    muscles: ['Latissimus Dorsi', 'Biceps', 'Rhomboids', 'Core'],
    tips: ['Start from full dead hang', 'Drive elbows toward hips', 'Pull chest to bar', 'Lower slowly and controlled'],
    category: 'Back · Bodyweight',
    cameraHint: 'Full body shot from the front or side — hands must be visible',
  },
  lat_pulldown: {
    images: [`${BASE}/Lat%20Pulldown%20with%20Bands/0.jpg`, `${BASE}/Lat%20Pulldown%20with%20Bands/1.jpg`],
    description: 'Grip the bar wider than shoulders, pull it down to your upper chest while squeezing your lats, then control it back up.',
    muscles: ['Latissimus Dorsi', 'Biceps', 'Rear Deltoids'],
    tips: ['Lean slightly back', 'Pull elbows down and back', 'Squeeze lats at bottom', 'Hands must be visible!'],
    category: 'Back · Machine',
    cameraHint: '⚠️ Step back so your hands AND the bar are fully visible in frame',
  },
  t_bar_row: {
    images: [`${BASE}/T-Bar%20Row%20with%20Handle/0.jpg`, `${BASE}/T-Bar%20Row%20with%20Handle/1.jpg`],
    description: 'Straddle the T-bar, hinge forward 45°, row the weight to your lower chest by driving elbows back.',
    muscles: ['Middle Back', 'Latissimus Dorsi', 'Biceps', 'Rear Deltoids'],
    tips: ['Keep back straight', 'Pull elbows past torso', 'Squeeze shoulder blades', 'Control the lowering'],
    category: 'Back · Compound',
    cameraHint: 'Side camera — hips, back, and arms should all be visible',
  },
  shoulder_press: {
    images: [`${BASE}/Barbell%20Shoulder%20Press/0.jpg`, `${BASE}/Barbell%20Shoulder%20Press/1.jpg`],
    description: 'Press the bar straight overhead from shoulder height. Core tight, drive through your heels.',
    muscles: ['Front Deltoids', 'Triceps', 'Upper Chest', 'Core'],
    tips: ['Neutral spine, tight core', 'Bar path straight up', 'Lock out overhead', 'Hands wider than shoulders'],
    category: 'Shoulders · Compound',
    cameraHint: 'Full body shot from front or side — hands must reach full overhead position',
  },
  lateral_raise: {
    images: [`${BASE}/Side%20Lateral%20Raise/0.jpg`, `${BASE}/Side%20Lateral%20Raise/1.jpg`],
    description: 'Stand with dumbbells at sides, raise arms out to shoulder height with slight elbow bend, lower slowly.',
    muscles: ['Lateral Deltoids', 'Supraspinatus'],
    tips: ['Lead with elbows not wrists', 'Stop at shoulder height', 'Avoid momentum or swinging', 'Control the descent'],
    category: 'Shoulders · Isolation',
    cameraHint: 'Front-facing camera — both arms must be visible at the same time',
  },
  biceps_curl: {
    images: [`${BASE}/Barbell%20Curl/0.jpg`, `${BASE}/Barbell%20Curl/1.jpg`],
    description: 'Hold the bar with underhand grip at hip level, curl it up toward your shoulders by contracting biceps.',
    muscles: ['Biceps Brachii', 'Brachialis', 'Forearms'],
    tips: ['Keep elbows pinned to sides', 'Do not swing body', 'Full extension at bottom', 'Squeeze at the top'],
    category: 'Arms · Isolation',
    cameraHint: 'Front or side camera — wrists AND elbows must both be visible',
  },
  barbell_biceps_curl: {
    images: [`${BASE}/Barbell%20Curl/0.jpg`, `${BASE}/Barbell%20Curl/1.jpg`],
    description: 'Hold the bar with underhand grip at hip level, curl it up toward your shoulders by contracting biceps.',
    muscles: ['Biceps Brachii', 'Brachialis', 'Forearms'],
    tips: ['Keep elbows pinned to sides', 'Do not swing body', 'Full extension at bottom', 'Squeeze at the top'],
    category: 'Arms · Isolation',
    cameraHint: 'Front or side camera — wrists AND elbows must both be visible',
  },
  hammer_curl: {
    images: [`${BASE}/Hammer%20Curl/0.jpg`, `${BASE}/Hammer%20Curl/1.jpg`],
    description: 'Neutral grip (thumbs up) dumbbell curl. Curl to shoulder height, lower slowly. Great for forearm and brachialis.',
    muscles: ['Brachialis', 'Biceps Brachii', 'Brachioradialis'],
    tips: ['Thumbs pointing up throughout', 'Elbows stay at sides', 'No torso lean or swing', 'Full curl and full extension'],
    category: 'Arms · Isolation',
    cameraHint: 'Side or front camera — both wrists and elbows visible',
  },
  tricep_dips: {
    images: [`${BASE}/Dip/0.jpg`, `${BASE}/Dip/1.jpg`],
    description: 'Support yourself on parallel bars, lower body by bending elbows to 90°, press back up to full extension.',
    muscles: ['Triceps', 'Lower Chest', 'Front Deltoids'],
    tips: ['Keep body upright for tricep focus', 'Lower to 90° elbow angle', 'Do not flare elbows wide', 'Press to full extension'],
    category: 'Arms · Bodyweight',
    cameraHint: 'Side camera — full arm from shoulder to wrist should be visible',
  },
  tricep_pushdown: {
    images: [`${BASE}/Cable%20Pushdown/0.jpg`, `${BASE}/Cable%20Pushdown/1.jpg`],
    description: 'Stand at cable machine, grip the bar, push it straight down until elbows are fully extended, return slowly.',
    muscles: ['Triceps (all three heads)'],
    tips: ['Elbows stay at your sides', 'Push all the way to full extension', 'Control the return', 'Lean slightly forward'],
    category: 'Arms · Cable',
    cameraHint: 'Side camera — elbows and wrists must be visible throughout',
  },
  plank: {
    images: [`${BASE}/Plank/0.jpg`, `${BASE}/Plank/1.jpg`],
    description: 'Support your body on forearms and toes. Keep a straight line from head to heels. Hold and breathe.',
    muscles: ['Transverse Abdominis', 'Rectus Abdominis', 'Glutes', 'Shoulder Stabilizers'],
    tips: ['Hips neither raised nor sagging', 'Neck neutral, gaze at floor', 'Squeeze glutes and core', 'Breathe steadily'],
    category: 'Core · Isometric',
    cameraHint: 'Side camera at floor level — full body from head to feet must be visible',
  },
  russian_twist: {
    images: [`${BASE}/Russian%20Twist/0.jpg`, `${BASE}/Russian%20Twist/1.jpg`],
    description: 'Sit with knees bent, lean back 45°, rotate torso side to side touching the ground with hands each rep.',
    muscles: ['Obliques', 'Rectus Abdominis', 'Hip Flexors'],
    tips: ['Keep chest lifted', 'Rotate from the torso not arms', 'Feet lifted for more challenge', 'Controlled twisting motion'],
    category: 'Core · Rotation',
    cameraHint: 'Front or 45° angle camera — both shoulders visible through full rotation',
  },
  leg_extension: {
    images: [`${BASE}/Leg%20Extensions/0.jpg`, `${BASE}/Leg%20Extensions/1.jpg`],
    description: 'Seated on leg extension machine, extend legs to full lockout then slowly lower. Isolates the quadriceps.',
    muscles: ['Quadriceps (all 4 heads)'],
    tips: ['Full lockout at top', 'Slow eccentric (3 sec down)', 'Toes slightly turned out', 'Avoid excessive weight'],
    category: 'Legs · Machine Isolation',
    cameraHint: 'Side camera — full leg from hip to ankle should be visible',
  },
  leg_raises: {
    images: [`${BASE}/Hanging%20Leg%20Raise/0.jpg`, `${BASE}/Hanging%20Leg%20Raise/1.jpg`],
    description: 'Hang from a bar with straight legs, raise them to 90° (or higher), lower slowly without swinging.',
    muscles: ['Rectus Abdominis (lower)', 'Hip Flexors', 'Core Stabilizers'],
    tips: ['Keep legs straight', 'No swinging or momentum', 'Lower slowly for max tension', 'Exhale as you raise'],
    category: 'Core · Hanging',
    cameraHint: 'Full body side or front camera — legs must be fully visible',
  },
  hip_thrust: {
    images: [`${BASE}/Barbell%20Hip%20Thrust/0.jpg`, `${BASE}/Barbell%20Hip%20Thrust/1.jpg`],
    description: 'Shoulders on a bench, bar across hips — drive hips up until body is parallel to floor, squeeze glutes at top.',
    muscles: ['Glutes (Gluteus Maximus)', 'Hamstrings', 'Core'],
    tips: ['Drive through heels', 'Full hip extension at top', 'Chin tucked, neutral neck', 'Squeeze glutes hard at peak'],
    category: 'Glutes · Compound',
    cameraHint: 'Side camera — full body from shoulders to knees should be visible',
  },
  glute_bridge: {
    images: [`${BASE}/Glute%20Bridge/0.jpg`, `${BASE}/Glute%20Bridge/1.jpg`],
    description: 'Lie on back with feet flat on the floor. Drive hips toward the ceiling, squeezing glutes. Lower slowly.',
    muscles: ['Glutes', 'Hamstrings', 'Core'],
    tips: ['Drive through heels not toes', 'Squeeze at the top for 1 sec', 'Neutral spine — no excessive arch', 'Keep core tight throughout'],
    category: 'Glutes · Rehabilitation',
    cameraHint: 'Side camera at floor level — hips, knees, and feet all visible',
  },
  straight_leg_raise: {
    images: [`${BASE}/Straight%20Leg%20Raise/0.jpg`, `${BASE}/Straight%20Leg%20Raise/1.jpg`],
    description: 'Lie on your back with one leg straight. Lift it to 45° while keeping the knee locked, then lower slowly.',
    muscles: ['Hip Flexors', 'Quadriceps', 'Lower Abdominals'],
    tips: ['Keep raised leg COMPLETELY straight', 'Only lift to 45° max', 'Press lower back into floor', 'Lower slowly — 3 second descent'],
    category: 'Rehabilitation · Hip',
    cameraHint: 'Side camera at floor level — full leg from hip to foot must be visible',
  },
  clamshell: {
    images: [`${BASE}/Clamshells/0.jpg`, `${BASE}/Clamshells/1.jpg`],
    description: 'Lie on your side with knees bent. Keep feet together and rotate the top knee upward like a clamshell opening.',
    muscles: ['Gluteus Medius', 'Gluteus Minimus', 'Hip External Rotators'],
    tips: ['Don\'t roll your hips backward', 'Keep feet glued together', 'Squeeze outer glute at top', 'Move with full control'],
    category: 'Rehabilitation · Hip',
    cameraHint: 'Side camera at floor level — full hip and knee range must be visible',
  },
  bird_dog: {
    images: [`${BASE}/Bird%20Dog/0.jpg`, `${BASE}/Bird%20Dog/1.jpg`],
    description: 'On all fours, extend the opposite arm and leg simultaneously, hold briefly, return and switch sides.',
    muscles: ['Erector Spinae', 'Glutes', 'Core Stabilizers', 'Shoulder Stabilizers'],
    tips: ['Keep spine completely neutral', 'Extend limbs to horizontal only', 'Engage abs throughout', 'Slow and controlled movement'],
    category: 'Rehabilitation · Core',
    cameraHint: 'Side camera at floor level — full body from hands to feet visible',
  },
  wall_slide: {
    images: [`${BASE}/Wall%20Slides/0.jpg`, `${BASE}/Wall%20Slides/1.jpg`],
    description: 'Stand against a wall, arms bent at 90° with elbows touching the wall. Slide arms overhead while maintaining contact.',
    muscles: ['Lower Trapezius', 'Serratus Anterior', 'Rotator Cuff', 'Shoulder Stabilizers'],
    tips: ['Lower back flat against wall', 'Elbows and wrists in contact with wall', 'Slide arms slowly overhead', 'Feel the shoulder blade movement'],
    category: 'Rehabilitation · Shoulder',
    cameraHint: 'Side or front camera — full arms from shoulder to wrist must be visible',
  },
};

const DEFAULT_DEMO: ExerciseDemo = {
  images: [`${BASE}/Push-Up/0.jpg`, `${BASE}/Push-Up/1.jpg`],
  description: 'Get ready to start your exercise. Position yourself in front of the camera and press Start Exercise.',
  muscles: ['Multiple muscle groups'],
  tips: ['Maintain good posture', 'Control your breathing', 'Focus on form over speed', 'Listen to audio coaching'],
  category: 'Exercise',
  cameraHint: 'Make sure your full body is clearly visible in the camera frame',
};

// ─── SVG BIOMECHANICAL SKELETON COORDINATES DATABASE (ALL 28 EXERCISES) ───────
interface Joint {
  x: number;
  y: number;
}

interface JointSet {
  head: Joint;
  shoulder: Joint;
  elbow?: Joint;
  wrist?: Joint;
  hip: Joint;
  knee: Joint;
  ankle: Joint;
  // Optional second limb for front-facing animations
  shoulderR?: Joint;
  elbowR?: Joint;
  wristR?: Joint;
  kneeR?: Joint;
  ankleR?: Joint;
  // Angles & Equipment Presets
  angleJoint?: 'knee' | 'elbow' | 'hip' | 'shoulder' | 'spine';
  angleValue?: string;
  equipmentType?: 'barbell' | 'dumbbells' | 'bench' | 'floor' | 'wall' | 'pulley' | 'none';
  eqP1?: Joint;
  eqP2?: Joint;
}

// Coordinate layout on a 200x200 grid
export const SKELETON_COORDS: Record<string, { start: JointSet; end: JointSet }> = {
  bench_press: {
    start: {
      head: { x: 50, y: 120 }, shoulder: { x: 75, y: 120 }, elbow: { x: 75, y: 145 }, wrist: { x: 75, y: 125 },
      hip: { x: 120, y: 120 }, knee: { x: 145, y: 155 }, ankle: { x: 145, y: 185 },
      angleJoint: 'elbow', angleValue: '90°', equipmentType: 'bench', eqP1: { x: 30, y: 122 }, eqP2: { x: 130, y: 122 }
    },
    end: {
      head: { x: 50, y: 120 }, shoulder: { x: 75, y: 120 }, elbow: { x: 75, y: 95 }, wrist: { x: 75, y: 70 },
      hip: { x: 120, y: 120 }, knee: { x: 145, y: 155 }, ankle: { x: 145, y: 185 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'bench', eqP1: { x: 30, y: 122 }, eqP2: { x: 130, y: 122 }
    }
  },
  incline_bench_press: {
    start: {
      head: { x: 50, y: 90 }, shoulder: { x: 70, y: 110 }, elbow: { x: 80, y: 135 }, wrist: { x: 75, y: 120 },
      hip: { x: 115, y: 140 }, knee: { x: 140, y: 155 }, ankle: { x: 140, y: 185 },
      angleJoint: 'elbow', angleValue: '90°', equipmentType: 'bench', eqP1: { x: 35, y: 75 }, eqP2: { x: 125, y: 150 }
    },
    end: {
      head: { x: 50, y: 90 }, shoulder: { x: 70, y: 110 }, elbow: { x: 55, y: 80 }, wrist: { x: 45, y: 55 },
      hip: { x: 115, y: 140 }, knee: { x: 140, y: 155 }, ankle: { x: 140, y: 185 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'bench', eqP1: { x: 35, y: 75 }, eqP2: { x: 125, y: 150 }
    }
  },
  decline_bench_press: {
    start: {
      head: { x: 75, y: 150 }, shoulder: { x: 85, y: 130 }, elbow: { x: 75, y: 110 }, wrist: { x: 85, y: 115 },
      hip: { x: 120, y: 100 }, knee: { x: 145, y: 125 }, ankle: { x: 140, y: 155 },
      angleJoint: 'elbow', angleValue: '90°', equipmentType: 'bench', eqP1: { x: 55, y: 160 }, eqP2: { x: 135, y: 90 }
    },
    end: {
      head: { x: 75, y: 150 }, shoulder: { x: 85, y: 130 }, elbow: { x: 105, y: 145 }, wrist: { x: 115, y: 160 },
      hip: { x: 120, y: 100 }, knee: { x: 145, y: 125 }, ankle: { x: 140, y: 155 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'bench', eqP1: { x: 55, y: 160 }, eqP2: { x: 135, y: 90 }
    }
  },
  push_up: {
    start: {
      head: { x: 40, y: 145 }, shoulder: { x: 55, y: 150 }, elbow: { x: 55, y: 130 }, wrist: { x: 55, y: 170 },
      hip: { x: 110, y: 160 }, knee: { x: 150, y: 165 }, ankle: { x: 180, y: 170 },
      angleJoint: 'elbow', angleValue: '90°', equipmentType: 'floor'
    },
    end: {
      head: { x: 40, y: 110 }, shoulder: { x: 55, y: 115 }, elbow: { x: 55, y: 140 }, wrist: { x: 55, y: 170 },
      hip: { x: 110, y: 135 }, knee: { x: 150, y: 150 }, ankle: { x: 180, y: 170 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'floor'
    }
  },
  chest_fly_machine: {
    start: {
      head: { x: 100, y: 50 }, shoulder: { x: 80, y: 75 }, elbow: { x: 50, y: 80 }, wrist: { x: 30, y: 75 },
      hip: { x: 100, y: 135 }, knee: { x: 100, y: 135 }, ankle: { x: 100, y: 135 },
      shoulderR: { x: 120, y: 75 }, elbowR: { x: 150, y: 80 }, wristR: { x: 170, y: 75 },
      angleJoint: 'shoulder', angleValue: '90°', equipmentType: 'pulley'
    },
    end: {
      head: { x: 100, y: 50 }, shoulder: { x: 80, y: 75 }, elbow: { x: 85, y: 95 }, wrist: { x: 95, y: 85 },
      hip: { x: 100, y: 135 }, knee: { x: 100, y: 135 }, ankle: { x: 100, y: 135 },
      shoulderR: { x: 120, y: 75 }, elbowR: { x: 115, y: 95 }, wristR: { x: 105, y: 85 },
      angleJoint: 'shoulder', angleValue: '10°', equipmentType: 'pulley'
    }
  },
  squat: {
    start: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 60 }, elbow: { x: 95, y: 75 }, wrist: { x: 95, y: 65 },
      hip: { x: 100, y: 110 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'knee', angleValue: '180°', equipmentType: 'barbell', eqP1: { x: 80, y: 60 }, eqP2: { x: 120, y: 60 }
    },
    end: {
      head: { x: 80, y: 100 }, shoulder: { x: 85, y: 115 }, elbow: { x: 80, y: 130 }, wrist: { x: 80, y: 120 },
      hip: { x: 75, y: 155 }, knee: { x: 115, y: 155 }, ankle: { x: 100, y: 185 },
      angleJoint: 'knee', angleValue: '90°', equipmentType: 'barbell', eqP1: { x: 65, y: 115 }, eqP2: { x: 105, y: 115 }
    }
  },
  deadlift: {
    start: {
      head: { x: 70, y: 90 }, shoulder: { x: 85, y: 110 }, elbow: { x: 85, y: 135 }, wrist: { x: 85, y: 160 },
      hip: { x: 125, y: 120 }, knee: { x: 115, y: 155 }, ankle: { x: 100, y: 185 },
      angleJoint: 'spine', angleValue: '45°', equipmentType: 'barbell', eqP1: { x: 65, y: 160 }, eqP2: { x: 105, y: 160 }
    },
    end: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 95 }, wrist: { x: 100, y: 125 },
      hip: { x: 100, y: 120 }, knee: { x: 100, y: 155 }, ankle: { x: 100, y: 185 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'barbell', eqP1: { x: 80, y: 125 }, eqP2: { x: 120, y: 125 }
    }
  },
  romanian_deadlift: {
    start: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 95 }, wrist: { x: 100, y: 125 },
      hip: { x: 100, y: 120 }, knee: { x: 100, y: 155 }, ankle: { x: 100, y: 185 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'barbell', eqP1: { x: 80, y: 125 }, eqP2: { x: 120, y: 125 }
    },
    end: {
      head: { x: 65, y: 80 }, shoulder: { x: 80, y: 100 }, elbow: { x: 80, y: 120 }, wrist: { x: 80, y: 140 },
      hip: { x: 125, y: 110 }, knee: { x: 115, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'spine', angleValue: '60°', equipmentType: 'barbell', eqP1: { x: 60, y: 140 }, eqP2: { x: 100, y: 140 }
    }
  },
  pull_up: {
    start: {
      head: { x: 100, y: 100 }, shoulder: { x: 85, y: 110 }, elbow: { x: 75, y: 80 }, wrist: { x: 75, y: 50 },
      hip: { x: 100, y: 155 }, knee: { x: 100, y: 175 }, ankle: { x: 100, y: 190 },
      shoulderR: { x: 115, y: 110 }, elbowR: { x: 125, y: 80 }, wristR: { x: 125, y: 50 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'wall', eqP1: { x: 60, y: 50 }, eqP2: { x: 140, y: 50 }
    },
    end: {
      head: { x: 100, y: 40 }, shoulder: { x: 85, y: 60 }, elbow: { x: 70, y: 85 }, wrist: { x: 75, y: 50 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 145 }, ankle: { x: 100, y: 170 },
      shoulderR: { x: 115, y: 60 }, elbowR: { x: 130, y: 85 }, wristR: { x: 125, y: 50 },
      angleJoint: 'elbow', angleValue: '45°', equipmentType: 'wall', eqP1: { x: 60, y: 50 }, eqP2: { x: 140, y: 50 }
    }
  },
  lat_pulldown: {
    start: {
      head: { x: 100, y: 90 }, shoulder: { x: 85, y: 105 }, elbow: { x: 70, y: 75 }, wrist: { x: 65, y: 45 },
      hip: { x: 85, y: 150 }, knee: { x: 70, y: 160 }, ankle: { x: 70, y: 190 },
      shoulderR: { x: 115, y: 105 }, elbowR: { x: 130, y: 75 }, wristR: { x: 135, y: 45 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'barbell', eqP1: { x: 50, y: 45 }, eqP2: { x: 150, y: 45 }
    },
    end: {
      head: { x: 100, y: 90 }, shoulder: { x: 85, y: 105 }, elbow: { x: 75, y: 125 }, wrist: { x: 75, y: 105 },
      hip: { x: 85, y: 150 }, knee: { x: 70, y: 160 }, ankle: { x: 70, y: 190 },
      shoulderR: { x: 115, y: 105 }, elbowR: { x: 125, y: 125 }, wristR: { x: 125, y: 105 },
      angleJoint: 'elbow', angleValue: '90°', equipmentType: 'barbell', eqP1: { x: 60, y: 105 }, eqP2: { x: 140, y: 105 }
    }
  },
  t_bar_row: {
    start: {
      head: { x: 70, y: 85 }, shoulder: { x: 85, y: 105 }, elbow: { x: 85, y: 130 }, wrist: { x: 85, y: 155 },
      hip: { x: 130, y: 115 }, knee: { x: 120, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'barbell', eqP1: { x: 60, y: 170 }, eqP2: { x: 95, y: 145 }
    },
    end: {
      head: { x: 70, y: 85 }, shoulder: { x: 85, y: 105 }, elbow: { x: 95, y: 95 }, wrist: { x: 90, y: 110 },
      hip: { x: 130, y: 115 }, knee: { x: 120, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '90°', equipmentType: 'barbell', eqP1: { x: 60, y: 170 }, eqP2: { x: 105, y: 100 }
    }
  },
  shoulder_press: {
    start: {
      head: { x: 100, y: 65 }, shoulder: { x: 80, y: 80 }, elbow: { x: 70, y: 105 }, wrist: { x: 70, y: 80 },
      hip: { x: 100, y: 130 }, knee: { x: 100, y: 160 }, ankle: { x: 100, y: 190 },
      shoulderR: { x: 120, y: 80 }, elbowR: { x: 130, y: 105 }, wristR: { x: 130, y: 80 },
      angleJoint: 'elbow', angleValue: '85°', equipmentType: 'barbell', eqP1: { x: 55, y: 80 }, eqP2: { x: 145, y: 80 }
    },
    end: {
      head: { x: 100, y: 65 }, shoulder: { x: 80, y: 80 }, elbow: { x: 75, y: 45 }, wrist: { x: 75, y: 20 },
      hip: { x: 100, y: 130 }, knee: { x: 100, y: 160 }, ankle: { x: 100, y: 190 },
      shoulderR: { x: 120, y: 80 }, elbowR: { x: 125, y: 45 }, wristR: { x: 125, y: 20 },
      angleJoint: 'elbow', angleValue: '175°', equipmentType: 'barbell', eqP1: { x: 60, y: 20 }, eqP2: { x: 140, y: 20 }
    }
  },
  lateral_raise: {
    start: {
      head: { x: 100, y: 50 }, shoulder: { x: 85, y: 70 }, elbow: { x: 80, y: 100 }, wrist: { x: 78, y: 130 },
      hip: { x: 100, y: 130 }, knee: { x: 100, y: 160 }, ankle: { x: 100, y: 190 },
      shoulderR: { x: 115, y: 70 }, elbowR: { x: 120, y: 100 }, wristR: { x: 122, y: 130 },
      angleJoint: 'shoulder', angleValue: '10°', equipmentType: 'dumbbells', eqP1: { x: 78, y: 135 }, eqP2: { x: 122, y: 135 }
    },
    end: {
      head: { x: 100, y: 50 }, shoulder: { x: 85, y: 70 }, elbow: { x: 55, y: 70 }, wrist: { x: 30, y: 70 },
      hip: { x: 100, y: 130 }, knee: { x: 100, y: 160 }, ankle: { x: 100, y: 190 },
      shoulderR: { x: 115, y: 70 }, elbowR: { x: 145, y: 70 }, wristR: { x: 170, y: 70 },
      angleJoint: 'shoulder', angleValue: '90°', equipmentType: 'dumbbells', eqP1: { x: 25, y: 70 }, eqP2: { x: 175, y: 70 }
    }
  },
  biceps_curl: {
    start: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 100, y: 145 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'dumbbells', eqP1: { x: 100, y: 150 }
    },
    end: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 95, y: 70 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '40°', equipmentType: 'dumbbells', eqP1: { x: 95, y: 65 }
    }
  },
  barbell_biceps_curl: {
    start: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 100, y: 145 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'barbell', eqP1: { x: 85, y: 145 }, eqP2: { x: 115, y: 145 }
    },
    end: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 95, y: 70 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '40°', equipmentType: 'barbell', eqP1: { x: 80, y: 70 }, eqP2: { x: 110, y: 70 }
    }
  },
  hammer_curl: {
    start: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 100, y: 145 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'dumbbells', eqP1: { x: 100, y: 150 }
    },
    end: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 95, y: 70 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'elbow', angleValue: '40°', equipmentType: 'dumbbells', eqP1: { x: 95, y: 65 }
    }
  },
  tricep_dips: {
    start: {
      head: { x: 95, y: 60 }, shoulder: { x: 95, y: 80 }, elbow: { x: 95, y: 110 }, wrist: { x: 95, y: 140 },
      hip: { x: 115, y: 125 }, knee: { x: 115, y: 155 }, ankle: { x: 105, y: 180 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'bench', eqP1: { x: 75, y: 140 }, eqP2: { x: 115, y: 140 }
    },
    end: {
      head: { x: 95, y: 85 }, shoulder: { x: 95, y: 105 }, elbow: { x: 65, y: 105 }, wrist: { x: 95, y: 140 },
      hip: { x: 115, y: 150 }, knee: { x: 115, y: 175 }, ankle: { x: 105, y: 190 },
      angleJoint: 'elbow', angleValue: '90°', equipmentType: 'bench', eqP1: { x: 75, y: 140 }, eqP2: { x: 115, y: 140 }
    }
  },
  tricep_pushdown: {
    start: {
      head: { x: 100, y: 50 }, shoulder: { x: 100, y: 70 }, elbow: { x: 100, y: 105 }, wrist: { x: 85, y: 85 },
      hip: { x: 115, y: 120 }, knee: { x: 110, y: 155 }, ankle: { x: 105, y: 185 },
      angleJoint: 'elbow', angleValue: '60°', equipmentType: 'pulley', eqP1: { x: 80, y: 40 }, eqP2: { x: 85, y: 85 }
    },
    end: {
      head: { x: 100, y: 50 }, shoulder: { x: 100, y: 70 }, elbow: { x: 100, y: 105 }, wrist: { x: 100, y: 145 },
      hip: { x: 115, y: 120 }, knee: { x: 110, y: 155 }, ankle: { x: 105, y: 185 },
      angleJoint: 'elbow', angleValue: '180°', equipmentType: 'pulley', eqP1: { x: 80, y: 40 }, eqP2: { x: 100, y: 145 }
    }
  },
  plank: {
    start: {
      head: { x: 40, y: 135 }, shoulder: { x: 55, y: 140 }, elbow: { x: 55, y: 170 }, wrist: { x: 75, y: 170 },
      hip: { x: 110, y: 142 }, knee: { x: 150, y: 155 }, ankle: { x: 180, y: 170 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'floor'
    },
    end: {
      head: { x: 40, y: 135 }, shoulder: { x: 55, y: 140 }, elbow: { x: 55, y: 170 }, wrist: { x: 75, y: 170 },
      hip: { x: 110, y: 142 }, knee: { x: 150, y: 155 }, ankle: { x: 180, y: 170 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'floor'
    }
  },
  russian_twist: {
    start: {
      head: { x: 75, y: 80 }, shoulder: { x: 85, y: 100 }, elbow: { x: 70, y: 120 }, wrist: { x: 60, y: 115 },
      hip: { x: 115, y: 145 }, knee: { x: 150, y: 125 }, ankle: { x: 170, y: 145 },
      angleJoint: 'hip', angleValue: '80°', equipmentType: 'floor'
    },
    end: {
      head: { x: 75, y: 80 }, shoulder: { x: 85, y: 100 }, elbow: { x: 100, y: 120 }, wrist: { x: 110, y: 115 },
      hip: { x: 115, y: 145 }, knee: { x: 150, y: 125 }, ankle: { x: 170, y: 145 },
      angleJoint: 'hip', angleValue: '80°', equipmentType: 'floor'
    }
  },
  leg_extension: {
    start: {
      head: { x: 90, y: 75 }, shoulder: { x: 90, y: 95 }, hip: { x: 95, y: 145 }, knee: { x: 135, y: 145 }, ankle: { x: 135, y: 185 },
      angleJoint: 'knee', angleValue: '90°', equipmentType: 'bench', eqP1: { x: 70, y: 145 }, eqP2: { x: 135, y: 145 }
    },
    end: {
      head: { x: 90, y: 75 }, shoulder: { x: 90, y: 95 }, hip: { x: 95, y: 145 }, knee: { x: 135, y: 145 }, ankle: { x: 175, y: 145 },
      angleJoint: 'knee', angleValue: '180°', equipmentType: 'bench', eqP1: { x: 70, y: 145 }, eqP2: { x: 135, y: 145 }
    }
  },
  leg_raises: {
    start: {
      head: { x: 50, y: 145 }, shoulder: { x: 70, y: 145 }, hip: { x: 120, y: 145 }, knee: { x: 150, y: 145 }, ankle: { x: 180, y: 145 },
      angleJoint: 'hip', angleValue: '180°', equipmentType: 'floor'
    },
    end: {
      head: { x: 50, y: 145 }, shoulder: { x: 70, y: 145 }, hip: { x: 120, y: 145 }, knee: { x: 120, y: 105 }, ankle: { x: 120, y: 65 },
      angleJoint: 'hip', angleValue: '90°', equipmentType: 'floor'
    }
  },
  hip_thrust: {
    start: {
      head: { x: 65, y: 125 }, shoulder: { x: 75, y: 128 }, hip: { x: 110, y: 155 }, knee: { x: 145, y: 120 }, ankle: { x: 145, y: 155 },
      angleJoint: 'hip', angleValue: '115°', equipmentType: 'bench', eqP1: { x: 45, y: 128 }, eqP2: { x: 75, y: 128 }
    },
    end: {
      head: { x: 65, y: 125 }, shoulder: { x: 75, y: 128 }, hip: { x: 110, y: 128 }, knee: { x: 145, y: 120 }, ankle: { x: 145, y: 155 },
      angleJoint: 'hip', angleValue: '180°', equipmentType: 'bench', eqP1: { x: 45, y: 128 }, eqP2: { x: 75, y: 128 }
    }
  },
  glute_bridge: {
    start: {
      head: { x: 60, y: 175 }, shoulder: { x: 75, y: 170 }, hip: { x: 115, y: 170 }, knee: { x: 145, y: 130 }, ankle: { x: 145, y: 175 },
      angleJoint: 'hip', angleValue: '120°', equipmentType: 'floor'
    },
    end: {
      head: { x: 60, y: 175 }, shoulder: { x: 75, y: 170 }, hip: { x: 115, y: 135 }, knee: { x: 145, y: 130 }, ankle: { x: 145, y: 175 },
      angleJoint: 'hip', angleValue: '180°', equipmentType: 'floor'
    }
  },
  straight_leg_raise: {
    start: {
      head: { x: 60, y: 170 }, shoulder: { x: 75, y: 170 }, hip: { x: 115, y: 170 }, knee: { x: 145, y: 170 }, ankle: { x: 175, y: 170 },
      angleJoint: 'hip', angleValue: '180°', equipmentType: 'floor'
    },
    end: {
      head: { x: 60, y: 170 }, shoulder: { x: 75, y: 170 }, hip: { x: 115, y: 170 }, knee: { x: 140, y: 140 }, ankle: { x: 160, y: 115 },
      angleJoint: 'hip', angleValue: '135°', equipmentType: 'floor'
    }
  },
  clamshell: {
    start: {
      head: { x: 50, y: 140 }, shoulder: { x: 65, y: 145 }, hip: { x: 115, y: 150 }, knee: { x: 140, y: 145 }, ankle: { x: 150, y: 160 },
      angleJoint: 'hip', angleValue: '0°', equipmentType: 'floor'
    },
    end: {
      head: { x: 50, y: 140 }, shoulder: { x: 65, y: 145 }, hip: { x: 115, y: 150 }, knee: { x: 135, y: 120 }, ankle: { x: 150, y: 160 },
      angleJoint: 'hip', angleValue: '35°', equipmentType: 'floor'
    }
  },
  bird_dog: {
    start: {
      head: { x: 70, y: 110 }, shoulder: { x: 85, y: 125 }, elbow: { x: 85, y: 155 }, wrist: { x: 85, y: 185 },
      hip: { x: 135, y: 125 }, knee: { x: 135, y: 155 }, ankle: { x: 135, y: 185 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'floor'
    },
    end: {
      head: { x: 70, y: 110 }, shoulder: { x: 85, y: 125 }, elbow: { x: 55, y: 125 }, wrist: { x: 25, y: 125 },
      hip: { x: 135, y: 125 }, knee: { x: 165, y: 125 }, ankle: { x: 195, y: 125 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'floor'
    }
  },
  wall_slide: {
    start: {
      head: { x: 100, y: 60 }, shoulder: { x: 80, y: 80 }, elbow: { x: 60, y: 80 }, wrist: { x: 60, y: 55 },
      hip: { x: 100, y: 130 }, knee: { x: 100, y: 160 }, ankle: { x: 100, y: 190 },
      shoulderR: { x: 120, y: 80 }, elbowR: { x: 140, y: 80 }, wristR: { x: 140, y: 55 },
      angleJoint: 'shoulder', angleValue: '90°', equipmentType: 'wall', eqP1: { x: 50, y: 200 }, eqP2: { x: 150, y: 200 }
    },
    end: {
      head: { x: 100, y: 60 }, shoulder: { x: 80, y: 80 }, elbow: { x: 70, y: 45 }, wrist: { x: 80, y: 15 },
      hip: { x: 100, y: 130 }, knee: { x: 100, y: 160 }, ankle: { x: 100, y: 190 },
      shoulderR: { x: 120, y: 80 }, elbowR: { x: 130, y: 45 }, wristR: { x: 120, y: 15 },
      angleJoint: 'shoulder', angleValue: '160°', equipmentType: 'wall', eqP1: { x: 50, y: 200 }, eqP2: { x: 150, y: 200 }
    }
  },
  default: {
    start: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 100, y: 145 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'floor'
    },
    end: {
      head: { x: 100, y: 45 }, shoulder: { x: 100, y: 65 }, elbow: { x: 100, y: 105 }, wrist: { x: 100, y: 145 },
      hip: { x: 100, y: 115 }, knee: { x: 100, y: 150 }, ankle: { x: 100, y: 185 },
      angleJoint: 'spine', angleValue: '0°', equipmentType: 'floor'
    }
  }
};

// ─── LOCAL BIOMECHANICAL SVG VISUALIZER ───────────────────────────────────────
const BiomechanicalVisualizer: React.FC<{ exerciseKey: string; phase: number }> = ({ exerciseKey, phase }) => {
  const coords = SKELETON_COORDS[exerciseKey] || SKELETON_COORDS.default;
  const rawCurrent = phase === 0 ? coords.start : coords.end;

  const current = {
    ...rawCurrent,
    elbow: rawCurrent.elbow || { x: rawCurrent.shoulder.x, y: rawCurrent.shoulder.y + 20 },
    wrist: rawCurrent.wrist || { x: rawCurrent.shoulder.x, y: rawCurrent.shoulder.y + 35 }
  };

  const transitionStyle: React.CSSProperties = {
    transition: 'all 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const renderBone = (j1: Joint, j2: Joint, key: string, isSecondary = false) => {
    return (
      <line
        key={key}
        x1={j1.x}
        y1={j1.y}
        x2={j2.x}
        y2={j2.y}
        stroke={isSecondary ? 'rgba(0, 229, 255, 0.35)' : '#00E5FF'}
        strokeWidth={isSecondary ? '2' : '3.5'}
        strokeLinecap="round"
        style={transitionStyle}
      />
    );
  };

  const renderJoint = (j: Joint, key: string, isSecondary = false) => {
    return (
      <g key={key}>
        <circle
          cx={j.x}
          cy={j.y}
          r={isSecondary ? '4' : '6.5'}
          fill={isSecondary ? 'rgba(0, 229, 255, 0.2)' : 'rgba(0, 229, 255, 0.4)'}
          style={transitionStyle}
        />
        <circle
          cx={j.x}
          cy={j.y}
          r={isSecondary ? '2' : '3'}
          fill="#FFFFFF"
          stroke={isSecondary ? 'rgba(0, 229, 255, 0.5)' : '#00E5FF'}
          strokeWidth="1.2"
          style={transitionStyle}
        />
      </g>
    );
  };

  const renderAngleIndicator = () => {
    if (!current.angleJoint || !current.angleValue) return null;
    let pivot: Joint = current.hip;
    let label = 'SPINE';

    if (current.angleJoint === 'knee') {
      pivot = current.knee;
      label = 'KNEE';
    } else if (current.angleJoint === 'elbow') {
      pivot = current.elbow;
      label = 'ELBOW';
    } else if (current.angleJoint === 'shoulder') {
      pivot = current.shoulder;
      label = 'SHOULDER';
    } else if (current.angleJoint === 'hip') {
      pivot = current.hip;
      label = 'HIP';
    }

    return (
      <g style={transitionStyle}>
        <circle
          cx={pivot.x}
          cy={pivot.y}
          r="14"
          fill="none"
          stroke="#69F0AE"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          style={transitionStyle}
        />
        <rect
          x={pivot.x + 16}
          y={pivot.y - 9}
          width="55"
          height="16"
          rx="3"
          fill="rgba(5, 5, 16, 0.85)"
          stroke="#69F0AE"
          strokeWidth="0.8"
        />
        <text
          x={pivot.x + 43}
          y={pivot.y + 2}
          fill="#69F0AE"
          fontSize="7.5px"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {`${label}: ${current.angleValue}`}
        </text>
      </g>
    );
  };

  const renderEquipment = () => {
    if (!current.equipmentType) return null;

    if (current.equipmentType === 'bench' && current.eqP1 && current.eqP2) {
      return (
        <g style={transitionStyle}>
          <line
            x1={current.eqP1.x}
            y1={current.eqP1.y}
            x2={current.eqP2.x}
            y2={current.eqP2.y}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="7"
            strokeLinecap="round"
            style={transitionStyle}
          />
          <line x1={current.eqP1.x + 15} y1={current.eqP1.y} x2={current.eqP1.x + 15} y2="185" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2.5" style={transitionStyle} />
          <line x1={current.eqP2.x - 15} y1={current.eqP2.y} x2={current.eqP2.x - 15} y2="185" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2.5" style={transitionStyle} />
        </g>
      );
    }

    if (current.equipmentType === 'barbell') {
      const barCenter = current.wrist;
      const barP1 = current.eqP1 || { x: barCenter.x - 22, y: barCenter.y };
      const barP2 = current.eqP2 || { x: barCenter.x + 22, y: barCenter.y };

      return (
        <g style={transitionStyle}>
          <line x1={barP1.x} y1={barP1.y} x2={barP2.x} y2={barP2.y} stroke="#CFD8DC" strokeWidth="2" style={transitionStyle} />
          <rect x={barP1.x - 3} y={barP1.y - 10} width="3" height="20" rx="1" fill="#FF5252" style={transitionStyle} />
          <rect x={barP1.x - 6} y={barP1.y - 7} width="2" height="14" rx="1" fill="#FF5252" style={transitionStyle} />
          <rect x={barP2.x} y={barP2.y - 10} width="3" height="20" rx="1" fill="#FF5252" style={transitionStyle} />
          <rect x={barP2.x + 4} y={barP2.y - 7} width="2" height="14" rx="1" fill="#FF5252" style={transitionStyle} />
        </g>
      );
    }

    if (current.equipmentType === 'dumbbells') {
      const renderSingleDumbbell = (wristPos: Joint) => (
        <g style={transitionStyle} key={`db-${wristPos.x}-${wristPos.y}`}>
          <line x1={wristPos.x - 5} y1={wristPos.y - 2} x2={wristPos.x + 5} y2={wristPos.y + 2} stroke="#ECEFF1" strokeWidth="1.8" style={transitionStyle} />
          <circle cx={wristPos.x - 5} cy={wristPos.y - 2} r="4" fill="#FF5252" style={transitionStyle} />
          <circle cx={wristPos.x + 5} cy={wristPos.y + 2} r="4" fill="#FF5252" style={transitionStyle} />
        </g>
      );

      return (
        <g style={transitionStyle}>
          {renderSingleDumbbell(current.wrist)}
          {current.wristR && renderSingleDumbbell(current.wristR)}
        </g>
      );
    }

    if (current.equipmentType === 'pulley') {
      return (
        <g style={transitionStyle}>
          <circle cx="45" cy="20" r="5" fill="rgba(255, 255, 255, 0.2)" stroke="#fff" strokeWidth="0.8" />
          <circle cx="155" cy="20" r="5" fill="rgba(255, 255, 255, 0.2)" stroke="#fff" strokeWidth="0.8" />
          <line x1="45" y1="20" x2={current.wrist.x} y2={current.wrist.y} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.8" style={transitionStyle} />
          {current.wristR && (
            <line x1="155" y1="20" x2={current.wristR.x} y2={current.wristR.y} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.8" style={transitionStyle} />
          )}
        </g>
      );
    }

    if (current.equipmentType === 'wall' && current.eqP1 && current.eqP2) {
      return (
        <g style={transitionStyle}>
          <line x1={current.eqP1.x} y1="10" x2={current.eqP1.x} y2={current.eqP2.y} stroke="rgba(0, 229, 255, 0.15)" strokeWidth="2.5" strokeDasharray="3 3" />
        </g>
      );
    }

    if (current.equipmentType === 'floor') {
      return (
        <g style={transitionStyle}>
          <line x1="10" y1="170" x2="190" y2="170" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1.5" />
        </g>
      );
    }

    return null;
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        viewBox="0 0 200 200"
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 50%, #060618 0%, #010107 100%)',
        }}
      >
        <defs>
          <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(0, 229, 255, 0.04)" strokeWidth="0.4" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        {renderEquipment()}

        {renderBone(current.head, current.shoulder, 'neck')}
        {renderBone(current.shoulder, current.elbow, 'upper-arm')}
        {renderBone(current.elbow, current.wrist, 'lower-arm')}
        {renderBone(current.shoulder, current.hip, 'spine-bone')}
        {renderBone(current.hip, current.knee, 'thigh')}
        {renderBone(current.knee, current.ankle, 'calf')}

        {current.shoulderR && current.elbowR && renderBone(current.shoulderR, current.elbowR, 'upper-arm-R', true)}
        {current.elbowR && current.wristR && renderBone(current.elbowR, current.wristR, 'lower-arm-R', true)}
        {current.hip && current.kneeR && renderBone(current.hip, current.kneeR, 'thigh-R', true)}
        {current.kneeR && current.ankleR && renderBone(current.kneeR, current.ankleR, 'calf-R', true)}

        {renderJoint(current.head, 'j-head')}
        {renderJoint(current.shoulder, 'j-shoulder')}
        {renderJoint(current.elbow, 'j-elbow')}
        {renderJoint(current.wrist, 'j-wrist')}
        {renderJoint(current.hip, 'j-hip')}
        {renderJoint(current.knee, 'j-knee')}
        {renderJoint(current.ankle, 'j-ankle')}

        {current.shoulderR && renderJoint(current.shoulderR, 'j-shoulderR', true)}
        {current.elbowR && renderJoint(current.elbowR, 'j-elbowR', true)}
        {current.wristR && renderJoint(current.wristR, 'j-wristR', true)}
        {current.kneeR && renderJoint(current.kneeR, 'j-kneeR', true)}
        {current.ankleR && renderJoint(current.ankleR, 'j-ankleR', true)}

        {renderAngleIndicator()}
      </svg>
    </Box>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface ExerciseDemoOverlayProps {
  exerciseKey: string;
  onStart: () => void;
  loading: boolean;
}

const ExerciseDemoOverlay: React.FC<ExerciseDemoOverlayProps> = ({ exerciseKey, onStart, loading }) => {
  const demo = EXERCISE_DEMOS[exerciseKey] ?? DEFAULT_DEMO;
  const [imgIndex, setImgIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [viewMode, setViewMode] = useState<'photo' | 'biomechanical'>('biomechanical');

  // Auto-cycle images/phases every 1.8s to simulate exercise range of motion
  useEffect(() => {
    setImgIndex(0);
    setImgError(false);
    
    // Default to Biomechanical Model if the exercise is a rehabilitation/physio exercise,
    // as photo assets are typically unavailable on the external repository.
    const isRehab = ['glute_bridge', 'clamshell', 'bird_dog', 'wall_slide', 'straight_leg_raise'].includes(exerciseKey);
    setViewMode(isRehab ? 'biomechanical' : 'photo');

    const timer = setInterval(() => {
      setImgIndex(prev => (prev + 1) % 2);
    }, 1800);
    return () => clearInterval(timer);
  }, [exerciseKey]);

  const handlePrev = () => setImgIndex(prev => (prev - 1 + 2) % 2);
  const handleNext = () => setImgIndex(prev => (prev + 1) % 2);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #12122a 60%, #1a1a3a 100%)',
        zIndex: 4,
      }}
    >
      {/* ── Visual presentation area ── */}
      <Box sx={{ position: 'relative', flex: '0 0 55%', overflow: 'hidden', bgcolor: '#050510' }}>
        
        {/* Toggle between Live Photo and Biomechanical Model */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            gap: 0.5,
            p: 0.5,
            borderRadius: '20px',
            background: 'rgba(5, 5, 16, 0.75)',
            border: '1.5px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <Button
            size="small"
            onClick={() => setViewMode('photo')}
            disabled={imgError}
            sx={{
              px: 1.5,
              py: 0.25,
              fontSize: '0.62rem',
              fontWeight: 700,
              color: viewMode === 'photo' ? '#1565c0' : 'rgba(255,255,255,0.7)',
              background: viewMode === 'photo' ? '#ffffff' : 'transparent',
              borderRadius: '15px',
              minWidth: 0,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              '&:hover': {
                background: viewMode === 'photo' ? '#ffffff' : 'rgba(255,255,255,0.08)',
              },
            }}
          >
            Photos
          </Button>
          <Button
            size="small"
            onClick={() => setViewMode('biomechanical')}
            sx={{
              px: 1.5,
              py: 0.25,
              fontSize: '0.62rem',
              fontWeight: 700,
              color: viewMode === 'biomechanical' ? '#1565c0' : 'rgba(255,255,255,0.7)',
              background: viewMode === 'biomechanical' ? '#ffffff' : 'transparent',
              borderRadius: '15px',
              minWidth: 0,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              '&:hover': {
                background: viewMode === 'biomechanical' ? '#ffffff' : 'rgba(255,255,255,0.08)',
              },
            }}
          >
            Clinical Model
          </Button>
        </Box>

        {/* Dynamic Display Rendering */}
        {viewMode === 'photo' && !imgError ? (
          <Box
            component="img"
            src={demo.images[imgIndex]}
            alt={`${exerciseKey} demonstration position ${imgIndex + 1}`}
            onError={() => {
              setImgError(true);
              setViewMode('biomechanical'); // Smooth automatic fallback!
            }}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              transition: 'opacity 0.4s ease',
              filter: 'brightness(0.95) contrast(1.05)',
            }}
          />
        ) : (
          <BiomechanicalVisualizer exerciseKey={exerciseKey} phase={imgIndex} />
        )}

        {/* Phase navigation arrows */}
        {demo.images.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              sx={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: 'white', bgcolor: 'rgba(0,0,0,0.45)', '&:hover': { bgcolor: 'rgba(0,229,255,0.25)' }, zIndex: 5 }}
              size="small"
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', color: 'white', bgcolor: 'rgba(0,0,0,0.45)', '&:hover': { bgcolor: 'rgba(0,229,255,0.25)' }, zIndex: 5 }}
              size="small"
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </>
        )}

        {/* Phase indicator label badge */}
        <Chip
          label={imgIndex === 0 ? '① Start Position' : '② End Position'}
          size="small"
          sx={{
            position: 'absolute', bottom: 10, left: 10,
            bgcolor: 'rgba(5,5,16,0.85)', color: '#00E5FF',
            border: '1px solid rgba(0,229,255,0.4)',
            fontSize: '0.65rem', fontWeight: 700,
            backdropFilter: 'blur(4px)',
            zIndex: 5
          }}
        />

        {/* Category label badge */}
        <Chip
          label={demo.category}
          size="small"
          sx={{
            position: 'absolute', bottom: 10, right: 10,
            bgcolor: 'rgba(5,5,16,0.85)', color: '#FFD740',
            border: '1px solid rgba(255,215,64,0.4)',
            fontSize: '0.65rem',
            backdropFilter: 'blur(4px)',
            zIndex: 5
          }}
        />
      </Box>

      {/* ── Info description panel ── */}
      <Box sx={{ flex: 1, px: 2, py: 1.5, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Description */}
        <Typography variant="body2" color="rgba(255,255,255,0.85)" lineHeight={1.5} sx={{ fontSize: '0.78rem' }}>
          {demo.description}
        </Typography>

        {/* Targeted Muscles */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <AccessibilityNewIcon sx={{ fontSize: 14, color: '#FF6B6B' }} />
            <Typography variant="caption" color="#FF6B6B" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Targeted Muscles
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {demo.muscles.map(m => (
              <Chip
                key={m}
                label={m}
                size="small"
                sx={{ bgcolor: 'rgba(255,107,107,0.15)', color: '#FF8A80', border: '1px solid rgba(255,107,107,0.3)', fontSize: '0.65rem', height: 20 }}
              />
            ))}
          </Box>
        </Box>

        {/* Clinical Form Tips */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#69F0AE' }} />
            <Typography variant="caption" color="#69F0AE" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Clinical Form Guidelines
            </Typography>
          </Box>
          <Box component="ul" sx={{ m: 0, pl: 2, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {demo.tips.map(tip => (
              <Typography component="li" key={tip} variant="caption" color="rgba(255,255,255,0.7)" sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>
                {tip}
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Camera Positioning Advice */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, bgcolor: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', borderRadius: 1.5, px: 1.25, py: 0.75 }}>
          <Typography sx={{ fontSize: '0.75rem' }}>📷</Typography>
          <Typography variant="caption" color="#80DEEA" sx={{ lineHeight: 1.4 }}>
            <strong>Camera Setup:</strong> {demo.cameraHint}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ExerciseDemoOverlay;
