import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
  LinearProgress,
  Snackbar
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SaveIcon from '@mui/icons-material/Save';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { apiService, ExerciseProtocol, UserSession } from '../services/api';

interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  riskProfile: 'High' | 'Medium' | 'Low';
}

const mockPatients: Patient[] = [
  { id: 'patient_123', name: 'John Doe', age: 45, condition: 'Post-ACL Reconstruction', riskProfile: 'Medium' },
  { id: 'jane_smith', name: 'Jane Smith', age: 62, condition: 'Chronic Lower Back Pain', riskProfile: 'High' },
  { id: 'robert_johnson', name: 'Robert Johnson', age: 29, condition: 'Shoulder Rotator Cuff Tear', riskProfile: 'Low' },
  { id: 'default', name: 'Standard Clinical Baseline', age: 0, condition: 'General Posture Training', riskProfile: 'Low' }
];

const EXERCISES = [
  { id: 'squat', name: 'Squats' },
  { id: 'deadlift', name: 'Deadlifts' },
  { id: 'push_up', name: 'Push-Ups' },
  { id: 'barbell_biceps_curl', name: 'Biceps Curl' },
  { id: 'shoulder_press', name: 'Shoulder Press' },
  { id: 'plank', name: 'Plank' },
  { id: 'leg_raises', name: 'Leg Raises' },
  { id: 'russian_twist', name: 'Russian Twist' }
];

export const TherapistPortal: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient>(mockPatients[0]);
  const [selectedExercise, setSelectedExercise] = useState<string>('squat');
  const [targetReps, setTargetReps] = useState<number>(10);
  const [safeSpineAngle, setSafeSpineAngle] = useState<number>(30);
  const [safeKneeAngle, setSafeKneeAngle] = useState<number>(90);
  const [safetySensitivity, setSafetySensitivity] = useState<string>('medium');
  
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch active patient protocols & sessions
  const loadPatientData = async () => {
    setLoading(true);
    try {
      // 1. Fetch protocol settings
      const protocols = await apiService.getProtocol(selectedPatient.id);
      const exerciseProtocol = protocols.find((p) => p.exercise === selectedExercise);
      
      if (exerciseProtocol) {
        setTargetReps(exerciseProtocol.target_reps);
        setSafeSpineAngle(exerciseProtocol.safe_spine_angle);
        setSafeKneeAngle(exerciseProtocol.safe_knee_angle);
        setSafetySensitivity(exerciseProtocol.safety_sensitivity);
      } else {
        // Fetch default configurations
        const defaultProtocols = await apiService.getDefaultProtocols();
        const defaultProto = defaultProtocols.find((p) => p.exercise === selectedExercise);
        if (defaultProto) {
          setTargetReps(defaultProto.target_reps);
          setSafeSpineAngle(defaultProto.safe_spine_angle);
          setSafeKneeAngle(defaultProto.safe_knee_angle);
          setSafetySensitivity(defaultProto.safety_sensitivity);
        }
      }

      // 2. Fetch exercise session history
      const history = await apiService.getUserSessions(selectedPatient.id);
      setSessions(history.sessions || []);
    } catch (error) {
      console.error('Failed to load patient configurations:', error);
      setSnackbar({
        open: true,
        message: 'Could not connect to backend server. Operating in demonstration mode.',
        severity: 'error'
      });
      // Mock history in case backend is loading/unavailable
      setSessions(getMockHistory(selectedPatient.id, selectedExercise));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, selectedExercise]);

  const handleSaveProtocol = async () => {
    setSaving(true);
    try {
      const payload: ExerciseProtocol = {
        user_id: selectedPatient.id,
        exercise: selectedExercise,
        target_reps: targetReps,
        safe_spine_angle: safeSpineAngle,
        safe_knee_angle: safeKneeAngle,
        safety_sensitivity: safetySensitivity
      };
      
      await apiService.saveProtocol(payload);
      setSnackbar({
        open: true,
        message: `Successfully synchronized safety protocol for ${selectedPatient.name}!`,
        severity: 'success'
      });
      
      // Reload sessions and active configurations
      void loadPatientData();
    } catch (error) {
      console.error('Failed to save protocol:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update protocol database. Check backend connection.',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // KPI Calculations
  const completedRepsTotal = sessions.reduce((acc, curr) => acc + curr.total_reps, 0);
  const avgReps = sessions.length > 0 ? Math.round(completedRepsTotal / sessions.length) : 0;
  
  // Calculate average injury flags and compliance score
  const totalInjuryFlags = sessions.reduce((acc, curr) => {
    const sessionDetail = curr.session_data?.[0];
    const flags = sessionDetail?.injury_flags ?? 0;
    return acc + flags;
  }, 0);

  const complianceRate = sessions.length > 0 
    ? Math.round((sessions.filter(s => {
        const detail = s.session_data?.[0];
        const flags = detail?.injury_flags ?? 0;
        return flags === 0;
      }).length / sessions.length) * 100)
    : 100;

  // Chart Data preparation
  const chartData = [...sessions].reverse().map((session, index) => {
    const detail = session.session_data?.[0] || {};
    const flags = detail.injury_flags ?? 0;
    const accuracy = detail.accuracy_score ?? (flags > 0 ? 65 : 90);
    return {
      name: `Session ${index + 1}`,
      reps: session.total_reps,
      duration: Math.round(session.duration),
      injuryFlags: flags,
      accuracy: accuracy,
      date: new Date(session.timestamp).toLocaleDateString()
    };
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom sx={{ color: '#1a237e' }}>
            Therapist Clinical Portal
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Prescribe dynamic safety protocols, configure real-time angles, and analyze patient biomechanics.
          </Typography>
        </Box>
        <Chip
          icon={<HealthAndSafetyIcon />}
          label="Clinical Control Active"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 'bold', border: '2px solid' }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Patient Directory */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, px: 1 }}>
              Patient Directory
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List sx={{ width: '100%' }}>
              {mockPatients.map((patient) => {
                const isSelected = patient.id === selectedPatient.id;
                return (
                  <ListItem
                    button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    selected={isSelected}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      transition: 'all 0.2s',
                      backgroundColor: isSelected ? 'rgba(26, 35, 126, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '4px solid #1a237e' : '4px solid transparent',
                      '&:hover': {
                        backgroundColor: isSelected ? 'rgba(26, 35, 126, 0.12)' : 'rgba(0,0,0,0.02)'
                      }
                    }}
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor: 
                            patient.riskProfile === 'High' 
                              ? '#e53935' 
                              : patient.riskProfile === 'Medium' 
                                ? '#ffb300' 
                                : '#4caf50'
                        }}
                      >
                        <PersonIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={patient.name}
                      secondary={
                        <Typography variant="caption" color="text.secondary" component="span">
                          {patient.id === 'default' ? 'Standard Baselines' : `${patient.condition} | Risk: ${patient.riskProfile}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Right Column: Protocol Editor & Analytics */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ width: '100%', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}>
              <Tabs
                value={currentTab}
                onChange={(_, newValue) => setCurrentTab(newValue)}
                sx={{
                  '& .MuiTab-root': { fontWeight: 'bold' },
                  '& .Mui-selected': { color: '#1a237e' }
                }}
              >
                <Tab icon={<FitnessCenterIcon />} iconPosition="start" label="Prescribe Protocol" />
                <Tab icon={<AssessmentIcon />} iconPosition="start" label="Biomechanical Analytics" />
              </Tabs>
            </Box>

            {loading && <LinearProgress color="primary" />}

            {/* Tab 0: Protocol Form */}
            {currentTab === 0 && (
              <Box sx={{ p: 4 }}>
                <Grid container spacing={4}>
                  {/* Selector Header */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel id="exercise-label">Select Target Exercise</InputLabel>
                      <Select
                        labelId="exercise-label"
                        value={selectedExercise}
                        onChange={(e) => setSelectedExercise(e.target.value)}
                        label="Select Target Exercise"
                        sx={{ borderRadius: 2 }}
                      >
                        {EXERCISES.map((ex) => (
                          <MenuItem key={ex.id} value={ex.id}>
                            {ex.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 1.5, bgcolor: '#e8eaf6', borderRadius: 2, borderLeft: '4px solid #1a237e' }}>
                      <Typography variant="body2" fontWeight="medium" color="#1a237e">
                        Active Patient: {selectedPatient.name} ({selectedPatient.age} y/o)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Condition: {selectedPatient.condition}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  {/* Protocol Parameters */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Target Repetitions: <strong>{targetReps} reps</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Number of completed repetitions prescribed for each set.
                      </Typography>
                      <Slider
                        value={targetReps}
                        onChange={(_, v) => setTargetReps(v as number)}
                        min={1}
                        max={30}
                        step={1}
                        valueLabelDisplay="auto"
                        marks={[{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }, { value: 20, label: '20' }, { value: 25, label: '25' }]}
                      />
                    </Box>

                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Max Safe Spine Flexion Limit: <strong>{safeSpineAngle}°</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Crucial for lifting exercises. Triggers real-time warnings if back tilts or rounds beyond threshold.
                      </Typography>
                      <Slider
                        value={safeSpineAngle}
                        onChange={(_, v) => setSafeSpineAngle(v as number)}
                        min={5}
                        max={50}
                        step={1}
                        valueLabelDisplay="auto"
                        color="warning"
                        marks={[{ value: 10, label: '10°' }, { value: 20, label: '20°' }, { value: 30, label: '30°' }, { value: 40, label: '40°' }]}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Minimum Knee Flexion Range: <strong>{safeKneeAngle}°</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Protects ACL/knee health. Configures depth guidelines during squats or leg extensions.
                      </Typography>
                      <Slider
                        value={safeKneeAngle}
                        onChange={(_, v) => setSafeKneeAngle(v as number)}
                        min={45}
                        max={140}
                        step={5}
                        valueLabelDisplay="auto"
                        color="secondary"
                        marks={[{ value: 60, label: '60°' }, { value: 90, label: '90°' }, { value: 120, label: '120°' }]}
                      />
                    </Box>

                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Safety System Sensitivity
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Defines tolerance levels for valgus caving and descent speeds before injury flags are raised.
                      </Typography>
                      <RadioGroup
                        row
                        value={safetySensitivity}
                        onChange={(e) => setSafetySensitivity(e.target.value)}
                      >
                        <FormControlLabel
                          value="high"
                          control={<Radio color="error" />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip label="High (Strict)" size="small" color="error" variant="outlined" />
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="medium"
                          control={<Radio color="warning" />}
                          label={<Chip label="Medium (Balanced)" size="small" color="warning" variant="outlined" />}
                        />
                        <FormControlLabel
                          value="low"
                          control={<Radio color="success" />}
                          label={<Chip label="Low (Relaxed)" size="small" color="success" variant="outlined" />}
                        />
                      </RadioGroup>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveProtocol}
                        disabled={saving}
                        sx={{
                          bgcolor: '#1a237e',
                          color: 'white',
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          boxShadow: '0 4px 14px rgba(26, 35, 126, 0.4)',
                          '&:hover': {
                            bgcolor: '#0d134d'
                          }
                        }}
                      >
                        {saving ? 'Synchronizing...' : 'Save & Sync Protocol'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tab 1: Analytics Dashboard */}
            {currentTab === 1 && (
              <Box sx={{ p: 4 }}>
                {sessions.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No session data logged for {selectedPatient.name} doing {selectedExercise.replace(/_/g, ' ')} yet.
                  </Alert>
                ) : (
                  <Grid container spacing={3}>
                    {/* Key Metrics Cards */}
                    <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: 'rgba(26, 35, 126, 0.04)', boxShadow: 'none', border: '1px solid rgba(26,35,126,0.1)' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            PRESCRIBED COMPLIANCE RATE
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1a237e', mt: 1 }}>
                            {complianceRate}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Percentage of sets with ZERO safety warning flags.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.04)', boxShadow: 'none', border: '1px solid rgba(76,175,80,0.1)' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            AVERAGE REPS PER SESSION
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" sx={{ color: '#2e7d32', mt: 1 }}>
                            {avgReps} / {targetReps}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Target rep completion rate.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: 'rgba(211, 47, 47, 0.04)', boxShadow: 'none', border: '1px solid rgba(211,47,47,0.1)' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            TOTAL INJURY WARNINGS FLAGGED
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" sx={{ color: '#c62828', mt: 1 }}>
                            {totalInjuryFlags}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total caving / back arches flagged by AI.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Chart 1: Repetition and Duration Trends */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #eee', boxShadow: 'none' }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUpIcon color="primary" /> Session Performance History
                        </Typography>
                        <Box sx={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <AreaChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Area type="monotone" dataKey="reps" stroke="#1a237e" fill="rgba(26, 35, 126, 0.2)" name="Reps Done" />
                              <Area type="monotone" dataKey="duration" stroke="#82ca9d" fill="rgba(130, 202, 157, 0.2)" name="Duration (s)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Chart 2: Injury Warnings and Form Accuracy */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #eee', boxShadow: 'none' }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WarningAmberIcon color="error" /> Postural Safety Warnings & Accuracy
                        </Typography>
                        <Box sx={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis yAxisId="left" orientation="left" stroke="#c62828" />
                              <YAxis yAxisId="right" orientation="right" stroke="#00c853" />
                              <Tooltip />
                              <Legend />
                              <Bar yAxisId="left" dataKey="injuryFlags" fill="#c62828" name="Injury Flags" />
                              <Bar yAxisId="right" dataKey="accuracy" fill="#00c853" name="Accuracy (%)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Helper: Generates beautiful mock session data in case backend db is starting up or empty
function getMockHistory(patientId: string, exercise: string): UserSession[] {
  const baseTime = Date.now();
  const mockLogs: { [key: string]: UserSession[] } = {
    patient_123: [
      {
        user_id: 'patient_123',
        exercise: exercise,
        total_reps: 10,
        duration: 35,
        timestamp: new Date(baseTime - 86400000 * 3).toISOString(),
        session_data: [{ final_rep_count: 10, duration_seconds: 35, injury_flags: 3, accuracy_score: 72 }]
      },
      {
        user_id: 'patient_123',
        exercise: exercise,
        total_reps: 11,
        duration: 38,
        timestamp: new Date(baseTime - 86400000 * 2).toISOString(),
        session_data: [{ final_rep_count: 11, duration_seconds: 38, injury_flags: 1, accuracy_score: 84 }]
      },
      {
        user_id: 'patient_123',
        exercise: exercise,
        total_reps: 12,
        duration: 40,
        timestamp: new Date(baseTime - 86400000 * 1).toISOString(),
        session_data: [{ final_rep_count: 12, duration_seconds: 40, injury_flags: 0, accuracy_score: 95 }]
      }
    ],
    jane_smith: [
      {
        user_id: 'jane_smith',
        exercise: exercise,
        total_reps: 6,
        duration: 25,
        timestamp: new Date(baseTime - 86400000 * 2).toISOString(),
        session_data: [{ final_rep_count: 6, duration_seconds: 25, injury_flags: 6, accuracy_score: 55 }]
      },
      {
        user_id: 'jane_smith',
        exercise: exercise,
        total_reps: 8,
        duration: 32,
        timestamp: new Date(baseTime - 86400000 * 1).toISOString(),
        session_data: [{ final_rep_count: 8, duration_seconds: 32, injury_flags: 4, accuracy_score: 68 }]
      }
    ],
    robert_johnson: [
      {
        user_id: 'robert_johnson',
        exercise: exercise,
        total_reps: 12,
        duration: 42,
        timestamp: new Date(baseTime - 86400000 * 1).toISOString(),
        session_data: [{ final_rep_count: 12, duration_seconds: 42, injury_flags: 0, accuracy_score: 98 }]
      }
    ],
    default: []
  };

  return mockLogs[patientId] || [];
}
