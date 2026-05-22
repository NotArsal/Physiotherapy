import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SuggestiveSearch from './ui/suggestive-search';

const EXERCISE_SUGGESTIONS = [
  'Search exercises, muscle groups, or categories...',
  'Try "Squat" or "Plank"',
  'Try "Biceps" or "Chest"',
  'Try "Physiotherapy"',
  'Find "Lat Pulldown" cues',
  'Search "Deadlift" technique',
];

interface ExerciseSelectorProps {
  onExerciseSelect: (exercise: string) => void;
}

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({ onExerciseSelect }) => {
  const { currentUser } = useAuth();
  const [exercises, setExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [prescribedExercise, setPrescribedExercise] = useState<any>(null);

  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem('physio_patients');
      if (saved) {
        try {
          const patientsList = JSON.parse(saved);
          const patientId = currentUser.uid || currentUser.email?.toLowerCase() || 'current_user';
          const patient = patientsList.find((p: any) => p.id === patientId);
          if (patient && patient.assignedExercise) {
            setPrescribedExercise(patient);
          } else {
            setPrescribedExercise(null);
          }
        } catch (e) {
          console.error("Failed to parse patients in ExerciseSelector", e);
        }
      }
    }
  }, [currentUser]);

  const exerciseInfo: {
    [key: string]: {
      name: string;
      description: string;
      benefits: string[];
      difficulty: string;
      category: string;
      muscleGroups: string[];
    };
  } = {
    barbell_biceps_curl: {
      name: 'Barbell Biceps Curl',
      description: 'Standing bicep exercise using a barbell to build arm strength',
      benefits: ['Bicep strength', 'Arm definition', 'Grip strength'],
      difficulty: 'Beginner',
      category: 'Arms',
      muscleGroups: ['Biceps', 'Forearms']
    },
    bench_press: {
      name: 'Bench Press',
      description: 'Classic chest exercise performed lying on a bench',
      benefits: ['Chest strength', 'Tricep development', 'Shoulder stability'],
      difficulty: 'Intermediate',
      category: 'Chest',
      muscleGroups: ['Chest', 'Triceps', 'Shoulders']
    },
    chest_fly_machine: {
      name: 'Chest Fly Machine',
      description: 'Chest isolation exercise using a fly machine',
      benefits: ['Chest isolation', 'Pectoral definition', 'Shoulder mobility'],
      difficulty: 'Beginner',
      category: 'Chest',
      muscleGroups: ['Chest', 'Front Deltoids']
    },
    deadlift: {
      name: 'Deadlift',
      description: 'Full body compound exercise lifting weight from the ground',
      benefits: ['Total body strength', 'Posterior chain', 'Core stability'],
      difficulty: 'Advanced',
      category: 'Full Body',
      muscleGroups: ['Hamstrings', 'Glutes', 'Back', 'Core']
    },
    decline_bench_press: {
      name: 'Decline Bench Press',
      description: 'Chest exercise performed on a decline bench',
      benefits: ['Lower chest focus', 'Tricep strength', 'Core engagement'],
      difficulty: 'Intermediate',
      category: 'Chest',
      muscleGroups: ['Lower Chest', 'Triceps', 'Shoulders']
    },
    hammer_curl: {
      name: 'Hammer Curl',
      description: 'Bicep exercise with neutral grip targeting brachialis',
      benefits: ['Bicep peak', 'Forearm strength', 'Grip improvement'],
      difficulty: 'Beginner',
      category: 'Arms',
      muscleGroups: ['Biceps', 'Brachialis', 'Forearms']
    },
    hip_thrust: {
      name: 'Hip Thrust',
      description: 'Glute activation exercise performed with elevated shoulders',
      benefits: ['Glute strength', 'Hip mobility', 'Posterior chain'],
      difficulty: 'Intermediate',
      category: 'Glutes',
      muscleGroups: ['Glutes', 'Hamstrings', 'Core']
    },
    incline_bench_press: {
      name: 'Incline Bench Press',
      description: 'Upper chest focused press on an inclined bench',
      benefits: ['Upper chest development', 'Shoulder strength', 'Core stability'],
      difficulty: 'Intermediate',
      category: 'Chest',
      muscleGroups: ['Upper Chest', 'Shoulders', 'Triceps']
    },
    lat_pulldown: {
      name: 'Lat Pulldown',
      description: 'Back width building exercise using lat pulldown machine',
      benefits: ['Back width', 'Lat development', 'Bicep assistance'],
      difficulty: 'Beginner',
      category: 'Back',
      muscleGroups: ['Lats', 'Rhomboids', 'Biceps']
    },
    lateral_raise: {
      name: 'Lateral Raise',
      description: 'Shoulder isolation exercise for medial deltoid development',
      benefits: ['Shoulder width', 'Deltoid definition', 'Shoulder stability'],
      difficulty: 'Beginner',
      category: 'Shoulders',
      muscleGroups: ['Side Deltoids', 'Traps']
    },
    leg_extension: {
      name: 'Leg Extension',
      description: 'Quadriceps isolation exercise using leg extension machine',
      benefits: ['Quad isolation', 'Knee strength', 'Leg definition'],
      difficulty: 'Beginner',
      category: 'Legs',
      muscleGroups: ['Quadriceps']
    },
    leg_raises: {
      name: 'Leg Raises',
      description: 'Core and hip flexor exercise lifting legs while lying down',
      benefits: ['Lower abs', 'Hip flexor strength', 'Core stability'],
      difficulty: 'Intermediate',
      category: 'Core',
      muscleGroups: ['Lower Abs', 'Hip Flexors']
    },
    plank: {
      name: 'Plank',
      description: 'Isometric core exercise holding body in straight line',
      benefits: ['Core strength', 'Posture improvement', 'Stability'],
      difficulty: 'Beginner',
      category: 'Core',
      muscleGroups: ['Core', 'Shoulders', 'Glutes']
    },
    pull_up: {
      name: 'Pull Up',
      description: 'Upper body compound exercise pulling body weight up',
      benefits: ['Back strength', 'Functional strength', 'Grip strength'],
      difficulty: 'Advanced',
      category: 'Back',
      muscleGroups: ['Lats', 'Biceps', 'Rhomboids']
    },
    push_up: {
      name: 'Push Up',
      description: 'Bodyweight chest exercise in prone position',
      benefits: ['Chest strength', 'Core engagement', 'Functional movement'],
      difficulty: 'Beginner',
      category: 'Chest',
      muscleGroups: ['Chest', 'Triceps', 'Core']
    },
    romanian_deadlift: {
      name: 'Romanian Deadlift',
      description: 'Hip hinge movement focusing on hamstrings and glutes',
      benefits: ['Hamstring flexibility', 'Glute strength', 'Hip mobility'],
      difficulty: 'Intermediate',
      category: 'Legs',
      muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back']
    },
    russian_twist: {
      name: 'Russian Twist',
      description: 'Rotational core exercise targeting obliques',
      benefits: ['Oblique strength', 'Rotational power', 'Core stability'],
      difficulty: 'Intermediate',
      category: 'Core',
      muscleGroups: ['Obliques', 'Core', 'Hip Flexors']
    },
    shoulder_press: {
      name: 'Shoulder Press',
      description: 'Overhead pressing movement for shoulder development',
      benefits: ['Shoulder strength', 'Overhead stability', 'Core engagement'],
      difficulty: 'Intermediate',
      category: 'Shoulders',
      muscleGroups: ['Shoulders', 'Triceps', 'Core']
    },
    squat: {
      name: 'Squat',
      description: 'Fundamental lower body compound exercise',
      benefits: ['Leg strength', 'Hip mobility', 'Functional movement'],
      difficulty: 'Beginner',
      category: 'Legs',
      muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings']
    },
    t_bar_row: {
      name: 'T-Bar Row',
      description: 'Back thickness exercise using T-bar or barbell',
      benefits: ['Back thickness', 'Rhomboid development', 'Posture improvement'],
      difficulty: 'Intermediate',
      category: 'Back',
      muscleGroups: ['Mid Traps', 'Rhomboids', 'Lats']
    },
    tricep_dips: {
      name: 'Tricep Dips',
      description: 'Bodyweight tricep exercise using parallel bars or bench',
      benefits: ['Tricep strength', 'Shoulder stability', 'Functional strength'],
      difficulty: 'Intermediate',
      category: 'Arms',
      muscleGroups: ['Triceps', 'Chest', 'Shoulders']
    },
    tricep_pushdown: {
      name: 'Tricep Pushdown',
      description: 'Cable tricep isolation exercise',
      benefits: ['Tricep isolation', 'Arm definition', 'Elbow stability'],
      difficulty: 'Beginner',
      category: 'Arms',
      muscleGroups: ['Triceps']
    },
    glute_bridge: {
      name: 'Glute Bridge',
      description: 'Gentle lower back and hip stabilization exercise',
      benefits: ['Lower back relief', 'Glute activation', 'Core stability'],
      difficulty: 'Beginner',
      category: 'Physiotherapy',
      muscleGroups: ['Glutes', 'Hamstrings', 'Lower Back']
    },
    clamshell: {
      name: 'Clamshells',
      description: 'Hip abduction exercise to strengthen gluteus medius and improve hip stability',
      benefits: ['Hip stability', 'Injury prevention', 'Knee alignment'],
      difficulty: 'Beginner',
      category: 'Physiotherapy',
      muscleGroups: ['Gluteus Medius', 'Hip Abductors']
    },
    bird_dog: {
      name: 'Bird Dog',
      description: 'Core stabilization exercise extending opposite arm and leg on hands and knees',
      benefits: ['Spinal alignment', 'Core balance', 'Coordination'],
      difficulty: 'Intermediate',
      category: 'Physiotherapy',
      muscleGroups: ['Lower Back', 'Glutes', 'Shoulders', 'Core']
    },
    wall_slide: {
      name: 'Wall Slides',
      description: 'Scapular and upper back rehabilitation exercise against a wall',
      benefits: ['Shoulder mobility', 'Scapular control', 'Posture correction'],
      difficulty: 'Beginner',
      category: 'Physiotherapy',
      muscleGroups: ['Upper Back', 'Rotator Cuff', 'Shoulders']
    },
    straight_leg_raise: {
      name: 'Straight Leg Raise',
      description: 'Knee strengthening exercise performed lying on your back',
      benefits: ['Knee rehabilitation', 'Quad strengthening', 'Hip flexor tone'],
      difficulty: 'Beginner',
      category: 'Physiotherapy',
      muscleGroups: ['Quadriceps', 'Hip Flexors']
    }
  };

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        // Try to load from cache first for instant UI
        const cached = localStorage.getItem('physio_exercises');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setExercises(parsed);
              setLoading(false);
            }
          } catch (e) {
            console.error('Failed to parse cached exercises');
          }
        }

        const fetchedExercises = await apiService.getExercises();
        setExercises(fetchedExercises);
        localStorage.setItem('physio_exercises', JSON.stringify(fetchedExercises));
      } catch (fetchError) {
        // Only show error if we don't even have cached data
        if (exercises.length === 0) {
          setError('Failed to load exercises. Please make sure the backend server is running.');
        }
        console.error('Error fetching exercises:', fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [exercises.length]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatExerciseName = (exercise: string): string => {
    const info = exerciseInfo[exercise];
    return info ? info.name : exercise.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const filteredExercises = exercises.filter((exercise) => {
    const info = exerciseInfo[exercise];
    const searchLower = searchTerm.toLowerCase();
    return (
      info?.name.toLowerCase().includes(searchLower) ||
      info?.category.toLowerCase().includes(searchLower) ||
      info?.muscleGroups.some((muscle) => muscle.toLowerCase().includes(searchLower)) ||
      exercise.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading exercises...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <FitnessCenterIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 500 }}>
          Choose Your Exercise
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}>
          Select an exercise to start your AI-powered physiotherapy session
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontFamily: '"Inter", sans-serif' }}>
          {exercises.length} exercises available from your trained model
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ── PRESCRIBED PROGRAM CARD (Glowing, Dark Navy + Coral Theme) ── */}
      {prescribedExercise && (
        <Card
          sx={{
            mb: 5,
            background: '#181715',
            border: '2px solid #cc785c',
            borderRadius: '16px',
            color: '#faf9f5',
            boxShadow: '0 8px 30px rgba(204, 120, 92, 0.25)', // Glowing warm coral shadow
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Chip 
                  label="Therapist Prescribed Program" 
                  sx={{ 
                    bgcolor: '#cc785c', 
                    color: '#faf9f5', 
                    fontWeight: 600, 
                    mb: 2, 
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '0.75rem'
                  }} 
                  size="small"
                />
                <Typography 
                  variant="h4" 
                  component="h2" 
                  sx={{ 
                    color: '#faf9f5', 
                    mb: 1.5,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontWeight: 500,
                    letterSpacing: '-0.01em'
                  }}
                >
                  Active Prescribed Protocol: {exerciseInfo[prescribedExercise.assignedExercise]?.name || formatExerciseName(prescribedExercise.assignedExercise)}
                </Typography>
                <Typography variant="body1" sx={{ color: '#efe9de', mb: 3, fontFamily: '"Inter", sans-serif', fontSize: '0.95rem' }}>
                  {exerciseInfo[prescribedExercise.assignedExercise]?.description || 'Custom tailored therapy session designed for your recovery.'}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ borderLeft: '2px solid #cc785c', pl: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#a9a69e', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                        Target Reps
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#faf9f5', fontWeight: 600, fontFamily: '"Inter", sans-serif', mt: 0.5 }}>
                        {prescribedExercise.targetReps || 10}
                      </Typography>
                    </Box>
                  </Grid>
                  {prescribedExercise.safeSpineAngle !== undefined && (
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ borderLeft: '2px solid #cc785c', pl: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#a9a69e', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                          Safe Spine
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#faf9f5', fontWeight: 600, fontFamily: '"Inter", sans-serif', mt: 0.5 }}>
                          ≤ {prescribedExercise.safeSpineAngle}°
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {prescribedExercise.safeKneeAngle !== undefined && (
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ borderLeft: '2px solid #cc785c', pl: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#a9a69e', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                          Safe Knee Depth
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#faf9f5', fontWeight: 600, fontFamily: '"Inter", sans-serif', mt: 0.5 }}>
                          ≥ {prescribedExercise.safeKneeAngle}°
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {prescribedExercise.safetySensitivity !== undefined && (
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ borderLeft: '2px solid #cc785c', pl: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#a9a69e', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                          Sensitivity
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#faf9f5', fontWeight: 600, fontFamily: '"Inter", sans-serif', mt: 0.5 }}>
                          {prescribedExercise.safetySensitivity}%
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => onExerciseSelect(prescribedExercise.assignedExercise)}
                  sx={{
                    bgcolor: '#cc785c',
                    color: '#ffffff',
                    fontWeight: 600,
                    px: 4,
                    py: 2,
                    fontSize: '1rem',
                    fontFamily: '"Inter", sans-serif',
                    borderRadius: '8px',
                    '&:hover': {
                      bgcolor: '#a9583e',
                    },
                    boxShadow: '0 4px 14px rgba(204, 120, 92, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  Start Prescribed Session
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
        <SuggestiveSearch
          suggestions={EXERCISE_SUGGESTIONS}
          effect="typewriter"
          onChange={(val) => setSearchTerm(val)}
          variant="light"
          className="w-full max-w-lg"
        />
      </Box>

      <Grid container spacing={3}>
        {filteredExercises.map((exercise) => {
          const info = exerciseInfo[exercise] || {
            name: formatExerciseName(exercise),
            description: 'Physiotherapy exercise for strength and mobility',
            benefits: ['Strength', 'Mobility', 'Health'],
            difficulty: 'Beginner',
            category: 'General',
            muscleGroups: ['Multiple']
          };

          return (
            <Grid item xs={12} sm={6} md={4} key={exercise}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  backgroundColor: '#efe9de',
                  border: '1px solid #e6dfd8',
                  borderRadius: '12px',
                  boxShadow: 'none',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    border: '1px solid #cc785c',
                    boxShadow: '0 4px 12px rgba(20, 20, 19, 0.05)'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>
                      {info.name}
                    </Typography>
                    <Chip
                      label={info.difficulty}
                      color={getDifficultyColor(info.difficulty) as 'success' | 'warning' | 'error' | 'default'}
                      size="small"
                      sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 500, fontSize: '0.7rem' }}
                    />
                  </Box>

                  <Chip 
                    label={info.category} 
                    variant="outlined" 
                    size="small" 
                    sx={{ mb: 2, fontFamily: '"Inter", sans-serif', fontSize: '0.75rem', borderColor: '#cc785c', color: '#cc785c' }} 
                  />

                  <Typography variant="body2" color="text.secondary" paragraph sx={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem' }}>
                    {info.description}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif', fontSize: '0.8rem', color: '#141413' }}>
                    Target Muscles:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {info.muscleGroups.map((muscle) => (
                      <Chip
                        key={muscle}
                        label={muscle}
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: '0.7rem', fontFamily: '"Inter", sans-serif', borderColor: '#e6dfd8' }}
                      />
                    ))}
                  </Box>

                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif', fontSize: '0.8rem', color: '#141413' }}>
                    Benefits:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {info.benefits.map((benefit) => (
                      <Chip
                        key={benefit}
                        label={benefit}
                        variant="filled"
                        size="small"
                        sx={{ fontSize: '0.7rem', fontFamily: '"Inter", sans-serif', bgcolor: 'rgba(204, 120, 92, 0.1)', color: '#cc785c', border: '1px solid rgba(204, 120, 92, 0.2)' }}
                      />
                    ))}
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onExerciseSelect(exercise)}
                    size="large"
                    sx={{ 
                      fontWeight: 600, 
                      py: 1.2, 
                      fontFamily: '"Inter", sans-serif', 
                      fontSize: '0.9rem',
                      bgcolor: '#cc785c',
                      color: '#ffffff',
                      '&:hover': {
                        bgcolor: '#a9583e'
                      }
                    }}
                  >
                    Start Exercise
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filteredExercises.length === 0 && exercises.length > 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No exercises found matching "{searchTerm}"
          </Typography>
          <Button variant="outlined" onClick={() => setSearchTerm('')} sx={{ mt: 2 }}>
            Clear Search
          </Button>
        </Box>
      )}

      {exercises.length === 0 && !loading && !error && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No exercises available. Please check your backend connection.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default ExerciseSelector;
