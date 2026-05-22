import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, IconButton } from '@mui/material';
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface ExerciseDemoOverlayProps {
  exerciseKey: string;
  onStart: () => void;
  loading: boolean;
}

const ExerciseDemoOverlay: React.FC<ExerciseDemoOverlayProps> = ({ exerciseKey, onStart, loading }) => {
  const demo = EXERCISE_DEMOS[exerciseKey] ?? DEFAULT_DEMO;
  const [imgIndex, setImgIndex] = useState(0);

  // Auto-cycle images/phases every 1.8s to simulate exercise range of motion
  useEffect(() => {
    setImgIndex(0);

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
        
        {/* Dynamic Display Rendering */}
        <Box
          component="img"
          src={demo.images[imgIndex]}
          alt={`${exerciseKey} demonstration position ${imgIndex + 1}`}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            transition: 'opacity 0.4s ease',
            filter: 'brightness(0.95) contrast(1.05)',
          }}
        />

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
