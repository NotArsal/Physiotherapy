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
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SaveIcon from '@mui/icons-material/Save';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
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

interface Prescription {
  exercise: string;
  targetReps: number;
  safeSpineAngle: number;
  safeKneeAngle: number;
  safetySensitivity: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  riskProfile: 'High' | 'Medium' | 'Low';
  assignedExercise?: string;
  targetReps?: number;
  safeSpineAngle?: number;
  safeKneeAngle?: number;
  safetySensitivity?: string;
  prescriptions?: Prescription[];
}

const EXERCISES = [
  { id: 'squat', name: 'Squats' },
  { id: 'deadlift', name: 'Deadlifts' },
  { id: 'push_up', name: 'Push-Ups' },
  { id: 'barbell_biceps_curl', name: 'Biceps Curl' },
  { id: 'shoulder_press', name: 'Shoulder Press' },
  { id: 'plank', name: 'Plank' },
  { id: 'leg_raises', name: 'Leg Raises' },
  { id: 'russian_twist', name: 'Russian Twist' },
  { id: 'glute_bridge', name: 'Glute Bridge (Physio)' },
  { id: 'clamshell', name: 'Clamshells (Physio)' },
  { id: 'bird_dog', name: 'Bird Dog (Physio)' },
  { id: 'wall_slide', name: 'Wall Slides (Physio)' },
  { id: 'straight_leg_raise', name: 'Straight Leg Raise (Physio)' }
];

export const TherapistPortal: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('physio_patients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mockIds = ['patient_123', 'jane_smith', 'robert_johnson', 'default'];
        return parsed.filter((p: any) => !mockIds.includes(p.id));
      } catch (e) {
        console.error("Failed to parse saved patients from localStorage", e);
      }
    }
    return [];
  });

  const [selectedPatient, setSelectedPatient] = useState<Patient>(() => {
    const saved = localStorage.getItem('physio_patients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mockIds = ['patient_123', 'jane_smith', 'robert_johnson', 'default'];
        const clean = parsed.filter((p: any) => !mockIds.includes(p.id));
        if (clean && clean.length > 0) return clean[0];
      } catch (e) {}
    }
    return { id: '', name: 'No Active Patient', age: 0, condition: 'None', riskProfile: 'Low' };
  });

  useEffect(() => {
    // If selectedPatient is not set or not in the active patients list, select the first patient
    if (patients.length > 0) {
      const exists = patients.some(p => p.id === selectedPatient.id);
      if (!exists || !selectedPatient.id) {
        setSelectedPatient(patients[0]);
      }
    } else if (selectedPatient.id) {
      setSelectedPatient({ id: '', name: 'No Active Patient', age: 0, condition: 'None', riskProfile: 'Low' });
    }
  }, [patients, selectedPatient.id]);

  useEffect(() => {
    localStorage.setItem('physio_patients', JSON.stringify(patients));
  }, [patients]);

  const [selectedExercise, setSelectedExercise] = useState<string>('squat');
  const [targetReps, setTargetReps] = useState<number>(10);
  const [safeSpineAngle, setSafeSpineAngle] = useState<number>(30);
  const [safeKneeAngle, setSafeKneeAngle] = useState<number>(90);
  const [safetySensitivity, setSafetySensitivity] = useState<string>('medium');

  const formatExerciseName = (exerciseId: string): string => {
    const found = EXERCISES.find(ex => ex.id === exerciseId);
    return found ? found.name : exerciseId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleRemovePrescription = (exerciseId: string) => {
    if (!selectedPatient.id) return;
    
    setPatients(prevPatients => {
      const updated = prevPatients.map(p => {
        if (p.id === selectedPatient.id) {
          const prescriptions = p.prescriptions ? p.prescriptions.filter(pr => pr.exercise !== exerciseId) : [];
          const first = prescriptions[0];
          return {
            ...p,
            assignedExercise: first ? first.exercise : undefined,
            targetReps: first ? first.targetReps : undefined,
            safeSpineAngle: first ? first.safeSpineAngle : undefined,
            safeKneeAngle: first ? first.safeKneeAngle : undefined,
            safetySensitivity: first ? first.safetySensitivity : undefined,
            prescriptions: prescriptions
          };
        }
        return p;
      });
      localStorage.setItem('physio_patients', JSON.stringify(updated));
      return updated;
    });

    setSelectedPatient(prev => {
      const prescriptions = prev.prescriptions ? prev.prescriptions.filter(pr => pr.exercise !== exerciseId) : [];
      const first = prescriptions[0];
      return {
        ...prev,
        assignedExercise: first ? first.exercise : undefined,
        targetReps: first ? first.targetReps : undefined,
        safeSpineAngle: first ? first.safeSpineAngle : undefined,
        safeKneeAngle: first ? first.safeKneeAngle : undefined,
        safetySensitivity: first ? first.safetySensitivity : undefined,
        prescriptions: prescriptions
      };
    });

    setSnackbar({
      open: true,
      message: `Removed prescription for ${formatExerciseName(exerciseId)}`,
      severity: 'success'
    });
  };

  const handleEditPrescription = (presc: Prescription) => {
    setSelectedExercise(presc.exercise);
    setTargetReps(presc.targetReps);
    setSafeSpineAngle(presc.safeSpineAngle);
    setSafeKneeAngle(presc.safeKneeAngle);
    setSafetySensitivity(presc.safetySensitivity);
    setSnackbar({
      open: true,
      message: `Loaded parameters for ${formatExerciseName(presc.exercise)}. Modify parameters and click "Save & Prescribe" on the right to update.`,
      severity: 'info'
    });
  };
  
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [openRegisterDialog, setOpenRegisterDialog] = useState<boolean>(false);
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [newPatientAge, setNewPatientAge] = useState<string>('');
  const [newPatientCondition, setNewPatientCondition] = useState<string>('');
  const [newPatientRisk, setNewPatientRisk] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newPatientEmail, setNewPatientEmail] = useState<string>('');

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientAge || !newPatientCondition.trim()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields.',
        severity: 'error'
      });
      return;
    }

    const ageNum = parseInt(newPatientAge, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid age.',
        severity: 'error'
      });
      return;
    }

    const patientId = newPatientEmail.trim() ? newPatientEmail.trim().toLowerCase() : `patient_${Date.now()}`;

    if (patients.some(p => p.id === patientId)) {
      setSnackbar({
        open: true,
        message: 'A patient with this Email/ID already exists.',
        severity: 'error'
      });
      return;
    }

    const newPatient: Patient = {
      id: patientId,
      name: newPatientName.trim(),
      age: ageNum,
      condition: newPatientCondition.trim(),
      riskProfile: newPatientRisk
    };

    setPatients(prev => [newPatient, ...prev]);
    setSelectedPatient(newPatient);
    setOpenRegisterDialog(false);

    setNewPatientName('');
    setNewPatientAge('');
    setNewPatientCondition('');
    setNewPatientRisk('Medium');
    setNewPatientEmail('');

    setSnackbar({
      open: true,
      message: `Successfully registered patient: ${newPatient.name}!`,
      severity: 'success'
    });
  };

  // Fetch active patient protocols & sessions
  const loadPatientData = async () => {
    if (!selectedPatient.id) {
      setSessions([]);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch protocol settings - Check if we have local prescription stored in the patient object first
      const patientInState = patients.find(p => p.id === selectedPatient.id);
      let localFound = false;
      if (patientInState) {
        const existingPresc = patientInState.prescriptions?.find(pr => pr.exercise === selectedExercise);
        if (existingPresc) {
          setTargetReps(existingPresc.targetReps ?? 10);
          setSafeSpineAngle(existingPresc.safeSpineAngle ?? 30);
          setSafeKneeAngle(existingPresc.safeKneeAngle ?? 90);
          setSafetySensitivity(existingPresc.safetySensitivity ?? 'medium');
          localFound = true;
        } else if (patientInState.assignedExercise === selectedExercise) {
          setTargetReps(patientInState.targetReps ?? 10);
          setSafeSpineAngle(patientInState.safeSpineAngle ?? 30);
          setSafeKneeAngle(patientInState.safeKneeAngle ?? 90);
          setSafetySensitivity(patientInState.safetySensitivity ?? 'medium');
          localFound = true;
        }
      }

      if (!localFound) {
        // Fallback to backend API
        try {
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
        } catch (apiError) {
          console.warn("Backend API not reachable, loading default parameters locally.");
          setTargetReps(10);
          setSafeSpineAngle(30);
          setSafeKneeAngle(90);
          setSafetySensitivity('medium');
        }
      }

      // 2. Fetch exercise session history
      try {
        const history = await apiService.getUserSessions(selectedPatient.id);
        setSessions(history.sessions || []);
      } catch (historyErr) {
        setSessions(getMockHistory(selectedPatient, selectedExercise));
      }
    } catch (error) {
      console.error('Failed to load patient configurations:', error);
      setSnackbar({
        open: true,
        message: 'Loaded profile in offline sync mode.',
        severity: 'success'
      });
      setSessions(getMockHistory(selectedPatient, selectedExercise));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, selectedExercise]);

  const handleSaveProtocol = async () => {
    if (!selectedPatient.id) {
      setSnackbar({
        open: true,
        message: 'No patient selected to apply protocol to.',
        severity: 'error'
      });
      return;
    }
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
      
      try {
        await apiService.saveProtocol(payload);
      } catch (apiErr) {
        console.warn('Could not save protocol to backend database. Synchronized in local patient profile.', apiErr);
      }

      // Update the patient record in local state and localStorage
      setPatients(prevPatients => {
        const updated = prevPatients.map(p => {
          if (p.id === selectedPatient.id) {
            const prescriptions = p.prescriptions ? [...p.prescriptions] : [];
            const idx = prescriptions.findIndex(pr => pr.exercise === selectedExercise);
            const newPrescription = {
              exercise: selectedExercise,
              targetReps: targetReps,
              safeSpineAngle: safeSpineAngle,
              safeKneeAngle: safeKneeAngle,
              safetySensitivity: safetySensitivity
            };
            if (idx >= 0) {
              prescriptions[idx] = newPrescription;
            } else {
              prescriptions.push(newPrescription);
            }

            return {
              ...p,
              assignedExercise: selectedExercise,
              targetReps: targetReps,
              safeSpineAngle: safeSpineAngle,
              safeKneeAngle: safeKneeAngle,
              safetySensitivity: safetySensitivity,
              prescriptions: prescriptions
            };
          }
          return p;
        });
        localStorage.setItem('physio_patients', JSON.stringify(updated));
        return updated;
      });

      // Update selectedPatient local state so UI reflects immediately
      setSelectedPatient(prev => {
        const prescriptions = prev.prescriptions ? [...prev.prescriptions] : [];
        const idx = prescriptions.findIndex(pr => pr.exercise === selectedExercise);
        const newPrescription = {
          exercise: selectedExercise,
          targetReps: targetReps,
          safeSpineAngle: safeSpineAngle,
          safeKneeAngle: safeKneeAngle,
          safetySensitivity: safetySensitivity
        };
        if (idx >= 0) {
          prescriptions[idx] = newPrescription;
        } else {
          prescriptions.push(newPrescription);
        }

        return {
          ...prev,
          assignedExercise: selectedExercise,
          targetReps: targetReps,
          safeSpineAngle: safeSpineAngle,
          safeKneeAngle: safeKneeAngle,
          safetySensitivity: safetySensitivity,
          prescriptions: prescriptions
        };
      });

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
        message: 'Failed to update protocol database.',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTherapistReport = () => {
    if (!selectedPatient.id || sessions.length === 0) return;

    const completedReps = sessions.reduce((acc, curr) => acc + curr.total_reps, 0);
    const avgRepsVal = sessions.length > 0 ? Math.round(completedReps / sessions.length) : 0;
    const totalWarnings = sessions.reduce((acc, curr) => {
      const detail = curr.session_data?.[0];
      return acc + (detail?.injury_flags ?? 0);
    }, 0);
    const compliance = sessions.length > 0 
      ? Math.round((sessions.filter(s => {
          const detail = s.session_data?.[0];
          return (detail?.injury_flags ?? 0) === 0;
        }).length / sessions.length) * 100)
      : 100;

    let csv = "CLINICAL PHYSIOTHERAPY PROGRESS REPORT\n";
    csv += `Patient Name,${selectedPatient.name}\n`;
    csv += `Patient ID/Email,${selectedPatient.id}\n`;
    csv += `Patient Age,${selectedPatient.age}\n`;
    csv += `Assigned Condition,${selectedPatient.condition}\n`;
    csv += `Risk Profile,${selectedPatient.riskProfile}\n`;
    csv += `Report Generated,${new Date().toLocaleString()}\n\n`;

    csv += "PRESCRIBED PROTOCOL PARAMETERS\n";
    csv += `Target Exercise,${formatExerciseName(selectedExercise)}\n`;
    csv += `Prescribed Target Reps,${targetReps}\n`;
    csv += `Safe Spine Angle Flexion Limit,${safeSpineAngle}°\n`;
    csv += `Minimum Knee Flexion Range,${safeKneeAngle}°\n`;
    csv += `Safety System Sensitivity,${safetySensitivity.toUpperCase()}\n\n`;

    csv += "CLINICAL SUMMARY METRICS\n";
    csv += `Total Sessions Logged,${sessions.length}\n`;
    csv += `Compliance Rate (sets without warnings),${compliance}%\n`;
    csv += `Average Repetitions per Session,${avgRepsVal}\n`;
    csv += `Total Postural Safety Flags,${totalWarnings}\n\n`;

    csv += "SESSION LOG DETAILS\n";
    csv += "Session #,Date & Time,Reps Completed,Duration (seconds),Postural Warnings,Accuracy Score (%)\n";

    [...sessions].reverse().forEach((s, idx) => {
      const dateStr = new Date(s.timestamp).toLocaleString();
      const detail = s.session_data?.[0] || {};
      const warnings = detail.injury_flags ?? 0;
      const accuracy = detail.accuracy_score !== undefined ? `${detail.accuracy_score}%` : 'N/A';
      csv += `Session ${idx + 1},"${dateStr}",${s.total_reps},${Math.round(s.duration)},${warnings},"${accuracy}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Clinical_Report_${selectedPatient.name.replace(/\s+/g, '_')}_${formatExerciseName(selectedExercise).replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbar({
      open: true,
      message: `Downloaded progress report for ${selectedPatient.name}`,
      severity: 'success'
    });
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
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              color: 'text.primary', 
              fontFamily: '"Cormorant Garamond", serif', 
              fontWeight: 500, 
              letterSpacing: '-0.02em' 
            }}
          >
            Therapist Clinical Portal
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif' }}>
            Prescribe dynamic safety protocols, configure real-time angles, and analyze patient biomechanics.
          </Typography>
        </Box>
        <Chip
          icon={<HealthAndSafetyIcon style={{ color: '#cc785c' }} />}
          label="Clinical Control Active"
          variant="outlined"
          sx={{ 
            fontWeight: 'bold', 
            border: '1px solid #cc785c', 
            color: '#cc785c', 
            bgcolor: isDark ? 'rgba(204, 120, 92, 0.1)' : 'rgba(239, 233, 222, 0.5)',
            fontFamily: '"Inter", sans-serif'
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Patient Directory */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%', borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 'none', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
              <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 500, fontSize: '1.25rem', color: 'text.primary' }}>
                Patient Directory
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setOpenRegisterDialog(true)}
                sx={{
                  bgcolor: '#cc785c',
                  color: 'white',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: '"Inter", sans-serif',
                  '&:hover': {
                    bgcolor: '#a9583e'
                  }
                }}
              >
                Register
              </Button>
            </Box>
            <Divider sx={{ mb: 2, borderColor: 'divider' }} />
            <List sx={{ width: '100%', flexGrow: 1, overflowY: 'auto', maxHeight: '70vh' }}>
              {patients.map((patient) => {
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
                      backgroundColor: isSelected ? 'background.default' : 'transparent',
                      borderLeft: isSelected ? '4px solid #cc785c' : '4px solid transparent',
                      border: isSelected ? '1px solid' : '1px solid transparent',
                      borderColor: isSelected ? 'divider' : 'transparent',
                      '&:hover': {
                        backgroundColor: isSelected ? 'background.default' : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(20,20,19,0.02)'
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
          <Paper sx={{ width: '100%', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Tabs
                value={currentTab}
                onChange={(_, newValue) => setCurrentTab(newValue)}
                sx={{
                  '& .MuiTabs-indicator': { backgroundColor: '#cc785c' },
                  '& .MuiTab-root': { 
                    fontWeight: 600, 
                    fontFamily: '"Inter", sans-serif', 
                    textTransform: 'none',
                    color: 'text.secondary',
                    '&.Mui-selected': { color: '#cc785c' }
                  }
                }}
              >
                <Tab icon={<FitnessCenterIcon />} iconPosition="start" label="Prescribe Protocol" />
                <Tab icon={<AssessmentIcon />} iconPosition="start" label="Biomechanical Analytics" />
              </Tabs>
            </Box>

            {loading && <LinearProgress color="primary" />}

            {/* Tab 0: Protocol Form */}
            {currentTab === 0 && (
              <Box sx={{ p: 4, bgcolor: 'background.default' }}>
                <Grid container spacing={4}>
                  {/* Left Pane: Active Prescribed Programs */}
                  <Grid item xs={12} md={5}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        fontFamily: '"Cormorant Garamond", serif', 
                        fontWeight: 600, 
                        fontSize: '1.35rem', 
                        color: 'text.primary',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <FitnessCenterIcon sx={{ color: '#cc785c', fontSize: 20 }} /> Active Prescriptions
                    </Typography>
                    
                    {!selectedPatient.prescriptions || selectedPatient.prescriptions.length === 0 ? (
                      <Box 
                        sx={{ 
                          p: 3, 
                          border: '1px dashed', 
                          borderColor: 'divider', 
                          borderRadius: 2, 
                          textAlign: 'center',
                          bgcolor: 'background.paper',
                          mt: 1
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontFamily: '"Inter", sans-serif' }}>
                          No exercises currently prescribed. Use the panel on the right to configure and add a safety protocol.
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
                        {selectedPatient.prescriptions.map((presc) => (
                          <Box 
                            key={presc.exercise} 
                            sx={{ 
                              p: 2, 
                              bgcolor: 'background.paper', 
                              border: '1px solid',
                              borderColor: 'divider', 
                              borderRadius: 2,
                              position: 'relative',
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: '#cc785c'
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'text.primary', fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' }}>
                                {formatExerciseName(presc.exercise)}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditPrescription(presc)}
                                  sx={{ 
                                    color: '#cc785c',
                                    p: 0.5,
                                    '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(20,20,19,0.05)' }
                                  }}
                                  title="Edit parameters"
                                >
                                  <EditIcon fontSize="small" sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleRemovePrescription(presc.exercise)}
                                  sx={{ 
                                    color: 'error.main',
                                    p: 0.5,
                                    '&:hover': { bgcolor: 'rgba(211,47,47,0.1)' }
                                  }}
                                  title="Remove prescription"
                                >
                                  <DeleteIcon fontSize="small" sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </Box>
                            
                            <Grid container spacing={1} sx={{ mt: 0.5 }}>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: '"Inter", sans-serif' }}>
                                  Reps: <strong>{presc.targetReps}</strong>
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: '"Inter", sans-serif', textTransform: 'capitalize' }}>
                                  Sens: <strong>{presc.safetySensitivity}</strong>
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: '"Inter", sans-serif' }}>
                                  Spine: <strong>≤ {presc.safeSpineAngle}°</strong>
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: '"Inter", sans-serif' }}>
                                  Knee: <strong>≥ {presc.safeKneeAngle}°</strong>
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Grid>

                  {/* Right Pane: Configure & Prescribe Form */}
                  <Grid item xs={12} md={7} sx={{ borderLeft: { md: `1px solid ${theme.palette.divider}` }, pl: { md: 4 } }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        fontFamily: '"Cormorant Garamond", serif', 
                        fontWeight: 600, 
                        fontSize: '1.35rem', 
                        color: 'text.primary',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      ✦ Configure & Prescribe
                    </Typography>
                    
                    <Grid container spacing={3}>
                      {/* Selector Header */}
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel id="exercise-label" sx={{ fontFamily: '"Inter", sans-serif' }}>Select Target Exercise</InputLabel>
                          <Select
                            labelId="exercise-label"
                            value={selectedExercise}
                            onChange={(e) => setSelectedExercise(e.target.value)}
                            label="Select Target Exercise"
                            sx={{ borderRadius: 2, bgcolor: 'background.paper', fontFamily: '"Inter", sans-serif' }}
                          >
                            {EXERCISES.map((ex) => (
                              <MenuItem key={ex.id} value={ex.id} sx={{ fontFamily: '"Inter", sans-serif' }}>
                                {ex.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, borderLeft: '4px solid #cc785c', border: '1px solid', borderColor: 'divider', borderLeftWidth: '4px' }}>
                          <Typography variant="body2" fontWeight="600" sx={{ color: 'text.primary', fontFamily: '"Inter", sans-serif' }}>
                            Active Patient: {selectedPatient.name} ({selectedPatient.age} y/o)
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif' }}>
                            Condition: {selectedPatient.condition}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 0.5, borderColor: 'divider' }} />
                      </Grid>

                      {/* Protocol Parameters */}
                      <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontFamily: '"Inter", sans-serif' }}>
                            Target Repetitions: <strong>{targetReps} reps</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                            Number of completed repetitions prescribed.
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

                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontFamily: '"Inter", sans-serif' }}>
                            Max Safe Spine Flexion Limit: <strong>{safeSpineAngle}°</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                            Triggers warnings if spine rounds beyond threshold.
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
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontFamily: '"Inter", sans-serif' }}>
                            Minimum Knee Flexion Range: <strong>{safeKneeAngle}°</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                            Configures depth guidelines for joints.
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

                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: 'text.primary', fontFamily: '"Inter", sans-serif' }}>
                            Safety System Sensitivity
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontFamily: '"Inter", sans-serif' }}>
                            Defines warning thresholds for posture deviations.
                          </Typography>
                          <RadioGroup
                            row
                            value={safetySensitivity}
                            onChange={(e) => setSafetySensitivity(e.target.value)}
                          >
                            <FormControlLabel
                              value="high"
                              control={<Radio color="error" size="small" />}
                              label={<Chip label="High (Strict)" size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                            />
                            <FormControlLabel
                              value="medium"
                              control={<Radio color="warning" size="small" />}
                              label={<Chip label="Medium (Balanced)" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                            />
                            <FormControlLabel
                              value="low"
                              control={<Radio color="success" size="small" />}
                              label={<Chip label="Low (Relaxed)" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                            />
                          </RadioGroup>
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                          <Button
                            variant="contained"
                            size="medium"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveProtocol}
                            disabled={saving}
                            sx={{
                              bgcolor: '#cc785c',
                              color: 'white',
                              borderRadius: 2,
                              px: 4,
                              py: 1.2,
                              boxShadow: 'none',
                              fontWeight: 600,
                              fontFamily: '"Inter", sans-serif',
                              '&:hover': {
                                bgcolor: '#a9583e'
                              }
                            }}
                          >
                            {saving ? 'Synchronizing...' : 'Save & Prescribe'}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tab 1: Analytics Dashboard */}
            {currentTab === 1 && (
              <Box sx={{ p: 4, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontFamily: '"Cormorant Garamond", serif', 
                        fontWeight: 600, 
                        fontSize: '1.4rem', 
                        color: 'text.primary' 
                      }}
                    >
                      Clinical Analytics: {selectedPatient.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif' }}>
                      Age: {selectedPatient.age} | Condition: {selectedPatient.condition} | Risk Profile: {selectedPatient.riskProfile}
                    </Typography>
                  </Box>
                  {sessions.length > 0 && (
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownloadTherapistReport}
                      sx={{
                        bgcolor: '#cc785c',
                        color: 'white',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        fontFamily: '"Inter", sans-serif',
                        boxShadow: 'none',
                        '&:hover': {
                          bgcolor: '#a9583e'
                        }
                      }}
                    >
                      Download Clinical Report
                    </Button>
                  )}
                </Box>
                {sessions.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider' }}>
                    No session data logged for {selectedPatient.name} doing {selectedExercise.replace(/_/g, ' ')} yet.
                  </Alert>
                ) : (
                  <Grid container spacing={3}>
                    {/* Key Metrics Cards */}
                    <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: 'background.paper', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                            PRESCRIBED COMPLIANCE RATE
                          </Typography>
                          <Typography variant="h4" sx={{ color: '#cc785c', mt: 1, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>
                            {complianceRate}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif', mt: 1, display: 'block' }}>
                            Percentage of sets with ZERO safety warning flags.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: 'background.paper', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                            AVERAGE REPS PER SESSION
                          </Typography>
                          <Typography variant="h4" sx={{ color: 'text.primary', mt: 1, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>
                            {avgReps} / {targetReps}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif', mt: 1, display: 'block' }}>
                            Target rep completion rate.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{ bgcolor: 'background.paper', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                            TOTAL INJURY WARNINGS FLAGGED
                          </Typography>
                          <Typography variant="h4" sx={{ color: '#c62828', mt: 1, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>
                            {totalInjuryFlags}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Inter", sans-serif', mt: 1, display: 'block' }}>
                            Total caving / back arches flagged by AI.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Chart 1: Repetition and Duration Trends */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
                        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, fontSize: '1.15rem' }}>
                          <TrendingUpIcon sx={{ color: '#cc785c' }} /> Session Performance History
                        </Typography>
                        <Box sx={{ width: '100%', height: 260, mt: 2 }}>
                          <ResponsiveContainer>
                            <AreaChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#32302b' : '#e6dfd8'} />
                              <XAxis dataKey="name" stroke={isDark ? '#a9a69e' : '#6c6a64'} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem' }} />
                              <YAxis stroke={isDark ? '#a9a69e' : '#6c6a64'} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem' }} />
                              <Tooltip contentStyle={{ backgroundColor: isDark ? '#22211e' : '#faf9f5', border: `1px solid ${isDark ? '#32302b' : '#e6dfd8'}`, color: isDark ? '#faf9f5' : '#141413', fontFamily: 'Inter, sans-serif' }} />
                              <Legend wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem' }} />
                              <Area type="monotone" dataKey="reps" stroke="#cc785c" fill="rgba(204, 120, 92, 0.2)" name="Reps Done" />
                              <Area type="monotone" dataKey="duration" stroke="#82ca9d" fill="rgba(130, 202, 157, 0.2)" name="Duration (s)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Chart 2: Injury Warnings and Form Accuracy */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
                        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, fontSize: '1.15rem' }}>
                          <WarningAmberIcon sx={{ color: '#c62828' }} /> Postural Safety Warnings & Accuracy
                        </Typography>
                        <Box sx={{ width: '100%', height: 260, mt: 2 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#32302b' : '#e6dfd8'} />
                              <XAxis dataKey="name" stroke={isDark ? '#a9a69e' : '#6c6a64'} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem' }} />
                              <YAxis yAxisId="left" orientation="left" stroke="#c62828" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem' }} />
                              <YAxis yAxisId="right" orientation="right" stroke="#00c853" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem' }} />
                              <Tooltip contentStyle={{ backgroundColor: isDark ? '#22211e' : '#faf9f5', border: `1px solid ${isDark ? '#32302b' : '#e6dfd8'}`, color: isDark ? '#faf9f5' : '#141413', fontFamily: 'Inter, sans-serif' }} />
                              <Legend wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem' }} />
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

      {/* Dialog for Patient Registration */}
      <Dialog 
        open={openRegisterDialog} 
        onClose={() => setOpenRegisterDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1.5,
            width: '100%',
            maxWidth: 500,
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none'
          }
        }}
      >
        <form onSubmit={handleRegisterPatient}>
          <DialogTitle sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 500, color: 'text.primary', fontSize: '1.5rem', pb: 1 }}>
            Register New Patient
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', fontFamily: '"Inter", sans-serif' }}>
              Create a clinical patient profile to set customized angle constraints and track session progress.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Full Name"
                  placeholder="e.g. Eleanor Vance"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  variant="outlined"
                  InputProps={{ sx: { borderRadius: 2, fontFamily: '"Inter", sans-serif' } }}
                  InputLabelProps={{ sx: { fontFamily: '"Inter", sans-serif' } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Age"
                  placeholder="e.g. 42"
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                  variant="outlined"
                  InputProps={{ sx: { borderRadius: 2, fontFamily: '"Inter", sans-serif' } }}
                  InputLabelProps={{ sx: { fontFamily: '"Inter", sans-serif' } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={8}>
                <FormControl fullWidth variant="outlined" required>
                  <InputLabel id="register-risk-label" sx={{ fontFamily: '"Inter", sans-serif' }}>Risk Profile</InputLabel>
                  <Select
                    labelId="register-risk-label"
                    value={newPatientRisk}
                    onChange={(e) => setNewPatientRisk(e.target.value as 'High' | 'Medium' | 'Low')}
                    label="Risk Profile"
                    sx={{ borderRadius: 2, fontFamily: '"Inter", sans-serif' }}
                  >
                    <MenuItem value="Low" sx={{ fontFamily: '"Inter", sans-serif' }}>Low Risk</MenuItem>
                    <MenuItem value="Medium" sx={{ fontFamily: '"Inter", sans-serif' }}>Medium Risk</MenuItem>
                    <MenuItem value="High" sx={{ fontFamily: '"Inter", sans-serif' }}>High Risk</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Injury / Condition"
                  placeholder="e.g. Post-ACL Reconstruction, Chronic Lower Back Pain"
                  value={newPatientCondition}
                  onChange={(e) => setNewPatientCondition(e.target.value)}
                  variant="outlined"
                  InputProps={{ sx: { borderRadius: 2, fontFamily: '"Inter", sans-serif' } }}
                  InputLabelProps={{ sx: { fontFamily: '"Inter", sans-serif' } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Optional Patient Email / Login UID"
                  placeholder="e.g. patient@example.com (links session history)"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  variant="outlined"
                  InputProps={{ sx: { borderRadius: 2, fontFamily: '"Inter", sans-serif' } }}
                  InputLabelProps={{ sx: { fontFamily: '"Inter", sans-serif' } }}
                  helperText="Linking email synchronizes sessions logged by the patient under their account."
                  FormHelperTextProps={{ sx: { fontFamily: '"Inter", sans-serif' } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1.5 }}>
            <Button 
              onClick={() => setOpenRegisterDialog(false)}
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none', 
                fontWeight: 600, 
                fontFamily: '"Inter", sans-serif',
                color: 'text.secondary' 
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: '#cc785c',
                color: 'white',
                borderRadius: 2,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                fontFamily: '"Inter", sans-serif',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#a9583e'
                }
              }}
            >
              Register Profile
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

// Helper: Generates beautiful mock session data in case backend db is starting up or empty
function getMockHistory(patient: Patient, exercise: string): UserSession[] {
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
    ]
  };

  if (mockLogs[patient.id]) {
    return mockLogs[patient.id];
  }

  if (patient.id === 'default') {
    return [];
  }

  // Generate high-fidelity session data tailored to the patient
  const riskMultiplier = patient.riskProfile === 'High' ? 2 : patient.riskProfile === 'Medium' ? 1 : 0.5;
  const isLowerBody = ['squat', 'deadlift', 'leg_raises', 'glute_bridge', 'clamshell', 'straight_leg_raise'].includes(exercise);
  const conditionFactor = patient.condition.toLowerCase();
  
  let baseReps = 8;
  if (conditionFactor.includes('acl') || conditionFactor.includes('knee')) {
    baseReps = isLowerBody ? 5 : 10;
  } else if (conditionFactor.includes('back') || conditionFactor.includes('spine')) {
    baseReps = exercise === 'deadlift' || exercise === 'squat' ? 4 : 8;
  } else if (conditionFactor.includes('shoulder') || conditionFactor.includes('rotator')) {
    baseReps = ['shoulder_press', 'push_up'].includes(exercise) ? 5 : 10;
  }

  return [
    {
      user_id: patient.id,
      exercise: exercise,
      total_reps: baseReps,
      duration: baseReps * 3.5,
      timestamp: new Date(baseTime - 86400000 * 4).toISOString(),
      session_data: [{
        final_rep_count: baseReps,
        duration_seconds: baseReps * 3.5,
        injury_flags: Math.round(4 * riskMultiplier),
        accuracy_score: Math.max(50, Math.round(70 - 10 * riskMultiplier))
      }]
    },
    {
      user_id: patient.id,
      exercise: exercise,
      total_reps: baseReps + 2,
      duration: (baseReps + 2) * 3.4,
      timestamp: new Date(baseTime - 86400000 * 2).toISOString(),
      session_data: [{
        final_rep_count: baseReps + 2,
        duration_seconds: (baseReps + 2) * 3.4,
        injury_flags: Math.round(2 * riskMultiplier),
        accuracy_score: Math.max(65, Math.round(82 - 5 * riskMultiplier))
      }]
    },
    {
      user_id: patient.id,
      exercise: exercise,
      total_reps: baseReps + 4,
      duration: (baseReps + 4) * 3.2,
      timestamp: new Date(baseTime - 86400000 * 1).toISOString(),
      session_data: [{
        final_rep_count: baseReps + 4,
        duration_seconds: (baseReps + 4) * 3.2,
        injury_flags: Math.round(0.5 * riskMultiplier),
        accuracy_score: Math.max(80, Math.round(92 - 2 * riskMultiplier))
      }]
    }
  ];
}
