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
import { EXERCISE_DEMOS } from './ExerciseDemoOverlay';

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
  const [prescribedExercises, setPrescribedExercises] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem('physio_patients');
      if (saved) {
        try {
          const patientsList = JSON.parse(saved);
          const patientId = currentUser.uid || currentUser.email?.toLowerCase() || 'current_user';
          const patient = patientsList.find((p: any) => p.id === patientId);
          if (patient) {
            if (patient.prescriptions && Array.isArray(patient.prescriptions) && patient.prescriptions.length > 0) {
              setPrescribedExercises(patient.prescriptions);
            } else if (patient.assignedExercise) {
              // Legacy fallback
              setPrescribedExercises([{
                exercise: patient.assignedExercise,
                targetReps: patient.targetReps || 10,
                safeSpineAngle: patient.safeSpineAngle,
                safeKneeAngle: patient.safeKneeAngle,
                safetySensitivity: patient.safetySensitivity || '50'
              }]);
            } else {
              setPrescribedExercises([]);
            }
          } else {
            setPrescribedExercises([]);
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

      {/* ── PRESCRIBED PROGRAMS GRID (Subtle outlines, Cream/Charcoal Theme) ── */}
      {prescribedExercises.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 3,
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 500,
              pb: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              color: 'text.primary'
            }}
          >
            Your Prescribed Protocols
          </Typography>
          <Grid container spacing={3}>
            {prescribedExercises.map((presc, index) => {
              const exKey = presc.exercise;
              const info = exerciseInfo[exKey] || {
                name: formatExerciseName(exKey),
                description: 'Custom tailored therapy session designed for your recovery.',
                category: 'Physiotherapy',
                muscleGroups: ['General'],
                benefits: ['Recovery', 'Strength'],
                difficulty: 'Beginner'
              };
              const demo = EXERCISE_DEMOS[exKey];
              const imageUrl = demo && demo.images && demo.images[0] 
                ? demo.images[0] 
                : 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-Up/0.jpg';

              return (
                <Grid item xs={12} sm={6} md={4} key={`${exKey}-${index}`}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'background.paper',
                      border: '1.5px solid',
                      borderColor: 'primary.main', // Warm coral accent for prescribed protocol
                      borderRadius: '12px',
                      boxShadow: 'none',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 4px 12px rgba(20, 20, 19, 0.05)'
                      }
                    }}
                  >
                    <Box sx={{ position: 'relative', height: 160, overflow: 'hidden', bgcolor: '#000000' }}>
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={info.name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: 0.85,
                          transition: 'transform 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                      />
                      <Chip 
                        label="Prescribed" 
                        sx={{ 
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          bgcolor: 'primary.main', 
                          color: '#ffffff', 
                          fontWeight: 600, 
                          fontFamily: '"Inter", sans-serif',
                          fontSize: '0.7rem'
                        }} 
                        size="small"
                      />
                    </Box>

                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography 
                          variant="h6" 
                          component="h3" 
                          sx={{ 
                            fontFamily: '"Cormorant Garamond", serif',
                            fontWeight: 600,
                            lineHeight: 1.2
                          }}
                        >
                          {info.name}
                        </Typography>
                        <Chip
                          label={info.difficulty}
                          color={getDifficultyColor(info.difficulty) as 'success' | 'warning' | 'error' | 'default'}
                          size="small"
                          sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 500, fontSize: '0.65rem' }}
                        />
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontFamily: '"Inter", sans-serif', 
                          fontSize: '0.8rem', 
                          mb: 2, 
                          height: 38, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {info.description}
                      </Typography>

                      <Grid container spacing={1} sx={{ mt: 1, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                        <Grid item xs={6}>
                          <Box sx={{ borderLeft: '2px solid', borderColor: 'primary.main', pl: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.02em' }}>
                              Target Reps
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>
                              {presc.targetReps || 10}
                            </Typography>
                          </Box>
                        </Grid>
                        {presc.safeSpineAngle !== undefined && (
                          <Grid item xs={6}>
                            <Box sx={{ borderLeft: '2px solid', borderColor: 'primary.main', pl: 1 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.02em' }}>
                                Safe Spine
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>
                                ≤ {presc.safeSpineAngle}°
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {presc.safeKneeAngle !== undefined && (
                          <Grid item xs={6}>
                            <Box sx={{ borderLeft: '2px solid', borderColor: 'primary.main', pl: 1 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.02em' }}>
                                Safe Knee
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>
                                ≥ {presc.safeKneeAngle}°
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {presc.safetySensitivity !== undefined && (
                          <Grid item xs={6}>
                            <Box sx={{ borderLeft: '2px solid', borderColor: 'primary.main', pl: 1 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.02em' }}>
                                Sensitivity
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>
                                {presc.safetySensitivity}%
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => onExerciseSelect(exKey)}
                        sx={{
                          bgcolor: 'primary.main',
                          color: '#ffffff',
                          fontWeight: 600,
                          py: 1,
                          fontSize: '0.85rem',
                          fontFamily: '"Inter", sans-serif',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }}
                      >
                        Start Session
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
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
          const demo = EXERCISE_DEMOS[exercise];
          const imageUrl = demo && demo.images && demo.images[0] 
            ? demo.images[0] 
            : 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-Up/0.jpg';

          return (
            <Grid item xs={12} sm={6} md={4} key={exercise}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '12px',
                  boxShadow: 'none',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main',
                    boxShadow: '0 4px 12px rgba(20, 20, 19, 0.05)'
                  }
                }}
              >
                <Box sx={{ position: 'relative', height: 160, overflow: 'hidden', bgcolor: '#000000' }}>
                  <Box
                    component="img"
                    src={imageUrl}
                    alt={info.name}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: 0.85,
                      transition: 'transform 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)'
                      }
                    }}
                  />
                  <Chip 
                    label={info.category} 
                    size="small" 
                    sx={{ 
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      bgcolor: 'background.paper', 
                      color: 'primary.main', 
                      fontWeight: 600, 
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '0.75rem',
                      border: '1px solid',
                      borderColor: 'primary.main'
                    }} 
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, lineHeight: 1.2 }}>
                      {info.name}
                    </Typography>
                    <Chip
                      label={info.difficulty}
                      color={getDifficultyColor(info.difficulty) as 'success' | 'warning' | 'error' | 'default'}
                      size="small"
                      sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 500, fontSize: '0.65rem' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph sx={{ fontFamily: '"Inter", sans-serif', fontSize: '0.8rem', mb: 2, height: 38, overflow: 'hidden' }}>
                    {info.description}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif', fontSize: '0.75rem', color: 'text.primary' }}>
                    Target Muscles:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {info.muscleGroups.map((muscle) => (
                      <Chip
                        key={muscle}
                        label={muscle}
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: '0.65rem', fontFamily: '"Inter", sans-serif', borderColor: 'divider' }}
                      />
                    ))}
                  </Box>

                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontFamily: '"Inter", sans-serif', fontSize: '0.75rem', color: 'text.primary' }}>
                    Benefits:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {info.benefits.map((benefit) => (
                      <Chip
                        key={benefit}
                        label={benefit}
                        variant="filled"
                        size="small"
                        sx={{ fontSize: '0.65rem', fontFamily: '"Inter", sans-serif', bgcolor: 'rgba(204, 120, 92, 0.1)', color: 'primary.main', border: '1px solid rgba(204, 120, 92, 0.15)' }}
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
                      py: 1, 
                      fontFamily: '"Inter", sans-serif', 
                      fontSize: '0.85rem',
                      bgcolor: 'primary.main',
                      color: '#ffffff',
                      '&:hover': {
                        bgcolor: 'primary.dark'
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
