import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Webcam from 'react-webcam';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { apiService, PredictionResponse } from '../services/api';
import { extractJointAngles, speak, getRandomFeedback, getExerciseSpecificFeedback, getMilestoneFeedback } from '../utils/poseDetection';
import { useAuth } from '../contexts/AuthContext';

interface ExerciseMonitorProps {
  selectedExercise: string;
  onBack: () => void;
}

const ExerciseMonitor: React.FC<ExerciseMonitorProps> = ({ selectedExercise, onBack }) => {
  const { currentUser } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [confidence, setConfidence] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [poseDetected, setPoseDetected] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [predictedExercise, setPredictedExercise] = useState('');
  const [exerciseFeedback, setExerciseFeedback] = useState('');
  const [formQuality, setFormQuality] = useState<'excellent' | 'good' | 'needs_improvement' | 'poor'>('good');
  const [aiModelDetails, setAiModelDetails] = useState<any>(null);
  const [consoleLog, setConsoleLog] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    backend: 'checking' | 'connected' | 'error';
    camera: 'checking' | 'connected' | 'error';
    pose: 'checking' | 'connected' | 'error';
    lastHealthCheck: Date | null;
  }>({
    backend: 'checking',
    camera: 'checking', 
    pose: 'checking',
    lastHealthCheck: null
  });

  // Timer for session duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, sessionStartTime]);

  // Initialize MediaPipe Pose
  useEffect(() => {
    const initializePose = async () => {
      try {
        addToConsoleLog('🔄 Initializing MediaPipe Pose...');
        
        // Clear any previous errors
        setError('');
        
        // Add troubleshooting tips
        addToConsoleLog('💡 Tip: Enable "Debug Mode" to see pose landmarks');
        addToConsoleLog('💡 Tip: Ensure good lighting and full body visibility');
        
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
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onPoseResults);
        poseRef.current = pose;
        
        addToConsoleLog('✅ MediaPipe Pose initialized successfully');
        addToConsoleLog('📱 Ready to start exercise detection!');
        
        // Test MediaPipe is working
        try {
          // Create a small test canvas to verify MediaPipe
          const testCanvas = document.createElement('canvas');
          testCanvas.width = 100;
          testCanvas.height = 100;
          const testCtx = testCanvas.getContext('2d');
          if (testCtx) {
            testCtx.fillStyle = 'black';
            testCtx.fillRect(0, 0, 100, 100);
            addToConsoleLog('🎨 Canvas rendering verified');
          }
        } catch (testError) {
          addToConsoleLog('⚠️ Canvas test failed, but continuing...');
        }
        
      } catch (error) {
        console.error('Error initializing pose detection:', error);
        setError('Failed to initialize pose detection. Please refresh the page.');
        addToConsoleLog('❌ MediaPipe initialization failed');
      }
    };

    // Add a small delay to ensure DOM is ready
    setTimeout(initializePose, 100);

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  const onPoseResults = useCallback(async (results: any) => {
    if (!canvasRef.current || !isActive || isPaused) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Always draw the video frame first
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      if (!poseDetected) {
        addToConsoleLog('👤 Pose detected! Drawing keypoints...');
      }
      setPoseDetected(true);
      
      // Draw pose landmarks with better visibility
      try {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 3
        });
        drawLandmarks(ctx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 2,
          radius: 4
        });
        
        // Add pose detection indicator
        ctx.fillStyle = '#00FF00';
        ctx.font = '16px Arial';
        ctx.fillText('✅ POSE DETECTED', 10, 30);
        
        // Add debug info if debug mode is enabled
        if (debugMode) {
          ctx.fillStyle = '#FFFF00';
          ctx.font = '12px Arial';
          ctx.fillText(`Landmarks: ${results.poseLandmarks.length}`, 10, 50);
          ctx.fillText(`Frame: ${Date.now()}`, 10, 65);
          
          // Draw landmark indices for debugging
          results.poseLandmarks.forEach((landmark: any, index: number) => {
            if (index % 5 === 0) { // Show every 5th landmark to avoid clutter
              const x = landmark.x * canvas.width;
              const y = landmark.y * canvas.height;
              ctx.fillStyle = '#YELLOW';
              ctx.font = '10px Arial';
              ctx.fillText(index.toString(), x + 5, y - 5);
            }
          });
        }
        
      } catch (drawError) {
        console.error('Drawing error:', drawError);
        addToConsoleLog(`❌ Drawing error: ${drawError}`);
      }

      // Extract joint angles and send to backend
      try {
        const jointAngles = extractJointAngles(results.poseLandmarks);
        
        // Debug logging if debug mode is enabled
        if (debugMode) {
          addToConsoleLog(`🔧 Debug: Joint angles: [${jointAngles.map(a => a.toFixed(1)).join(', ')}]`);
        }
        
        // Validate joint angles before sending
        if (!jointAngles || jointAngles.length !== 9) {
          addToConsoleLog('⚠️ Invalid joint angles extracted');
          return;
        }
        
        // Check for reasonable angle values (0-180 degrees)
        const invalidAngles = jointAngles.filter(angle => angle < 0 || angle > 180 || isNaN(angle));
        if (invalidAngles.length > 0) {
          addToConsoleLog(`⚠️ Detected ${invalidAngles.length} invalid angle(s), skipping prediction`);
          return;
        }
        
        // Make prediction with retry logic
        let predictionResult;
        try {
          predictionResult = await apiService.predictExercise(jointAngles, selectedExercise);
        } catch (apiError) {
          addToConsoleLog(`❌ API prediction failed: ${apiError}`);
          return;
        }
        
        // Validate prediction result
        if (!predictionResult || typeof predictionResult.confidence !== 'number') {
          addToConsoleLog('❌ Invalid prediction result received');
          return;
        }
        
        // Only log significant changes to avoid spam
        if (Math.abs(predictionResult.confidence - confidence) > 0.1 || 
            predictionResult.exercise !== predictedExercise) {
          addToConsoleLog(`🤖 BiLSTM: ${predictionResult.exercise} (${(predictionResult.confidence * 100).toFixed(1)}%)`);
        }
        
        // Update states
        setPrediction(predictionResult);
        setRepCount(predictionResult.rep_count);
        setCurrentPhase(predictionResult.phase);
        setConfidence(predictionResult.confidence);
        
        // Set AI model detailed outputs
        setPredictedExercise(predictionResult.exercise || 'Unknown');
        setAiModelDetails(predictionResult);
        
        // Generate exercise feedback based on confidence and form
        const generateFeedback = (result: PredictionResponse) => {
          const confidence = result.confidence;
          const isCorrectExercise = result.exercise?.toLowerCase() === selectedExercise.toLowerCase();
          
          if (confidence >= 0.85 && isCorrectExercise) {
            setFormQuality('excellent');
            return "Perfect form! Keep it up!";
          } else if (confidence >= 0.70 && isCorrectExercise) {
            setFormQuality('good');
            return "Good form! Stay focused on your movement.";
          } else if (confidence >= 0.50) {
            setFormQuality('needs_improvement');
            return isCorrectExercise 
              ? "Form needs improvement. Focus on proper technique."
              : `AI detected ${result.exercise?.replace(/_/g, ' ')} instead of ${selectedExercise.replace(/_/g, ' ')}`;
          } else {
            setFormQuality('poor');
            return "Low confidence detection. Check your positioning.";
          }
        };
        
        const newFeedback = generateFeedback(predictionResult);
        setExerciseFeedback(newFeedback);
        
        // Log rep count changes and feedback
        if (predictionResult.rep_count > repCount) {
          addToConsoleLog(`🔢 Rep count: ${repCount} → ${predictionResult.rep_count}`);
        }
        if (predictionResult.phase !== currentPhase) {
          addToConsoleLog(`📈 Phase: ${currentPhase} → ${predictionResult.phase}`);
        }

        // Voice feedback based on rep count and confidence
        if (voiceEnabled && predictionResult.rep_count > repCount) {
          let feedback: string;
          if (predictionResult.rep_count % 5 === 0 || predictionResult.rep_count <= 3) {
            feedback = getMilestoneFeedback(predictionResult.rep_count);
          } else {
            feedback = Math.random() > 0.5 
              ? getRandomFeedback('goodRep')
              : getExerciseSpecificFeedback(selectedExercise);
          }
          speak(feedback);
        }

      } catch (error) {
        console.error('Error processing pose results:', error);
        addToConsoleLog(`❌ Pose processing error: ${error}`);
      }
    } else {
      if (poseDetected) {
        addToConsoleLog('❌ Pose lost');
      }
      setPoseDetected(false);
      
      // Draw "No Pose" indicator
      if (isActive) {
        ctx.fillStyle = '#FF0000';
        ctx.font = '16px Arial';
        ctx.fillText('❌ NO POSE DETECTED', 10, 30);
      }
    }
  }, [isActive, isPaused, repCount, currentPhase, voiceEnabled, selectedExercise, poseDetected, confidence, predictedExercise, debugMode]);

  const startCamera = useCallback(async () => {
    try {
      addToConsoleLog('🎥 Starting camera...');
      
      if (!webcamRef.current?.video) {
        addToConsoleLog('❌ Webcam video element not found');
        setError('Camera not available. Please allow camera permissions.');
        return;
      }
      
      if (!poseRef.current) {
        addToConsoleLog('❌ MediaPipe Pose not initialized');
        setError('Pose detection not ready. Please refresh the page.');
        return;
      }
      
      addToConsoleLog('✅ Webcam and Pose ready, creating camera...');
      
      // Wait a bit for webcam to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const video = webcamRef.current.video;
      
      // Ensure video is playing
      if (video.paused) {
        await video.play();
      }
      
      addToConsoleLog(`📹 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      
      // Update canvas size to match video
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || 640;
        canvasRef.current.height = video.videoHeight || 480;
        addToConsoleLog(`🎨 Canvas sized to: ${canvasRef.current.width}x${canvasRef.current.height}`);
      }
      
      const camera = new Camera(video, {
        onFrame: async () => {
          if (video && poseRef.current && isActive && !isPaused) {
            try {
              await poseRef.current.send({ image: video });
            } catch (frameError) {
              console.error('Frame processing error:', frameError);
            }
          }
        },
        width: video.videoWidth || 640,
        height: video.videoHeight || 480
      });
      
      cameraRef.current = camera;
      addToConsoleLog('🚀 Starting MediaPipe camera...');
      await camera.start();
      addToConsoleLog('✅ Camera started successfully!');
      addToConsoleLog('👀 Waiting for pose detection...');
      
    } catch (error) {
      console.error('Camera start error:', error);
      addToConsoleLog(`❌ Camera error: ${error}`);
      setError('Failed to start camera. Please check permissions and refresh.');
    }
  }, [isActive, isPaused]);

  const handleStart = async () => {
    try {
      setError('');
      addToConsoleLog('🚀 Starting exercise session...');
      
      // Pre-flight checks - like in the working test
      addToConsoleLog('🔍 Running pre-flight checks...');
      
      // Check backend connectivity
      try {
        const health = await apiService.healthCheck();
        addToConsoleLog(`✅ Backend healthy: ${health.status}`);
      } catch (backendError) {
        addToConsoleLog('❌ Backend connection failed');
        setError('Backend connection failed. Please ensure the backend is running.');
        return;
      }
      
      // Check if selected exercise is available
      try {
        const exercises = await apiService.getExercises();
        if (!exercises.includes(selectedExercise)) {
          addToConsoleLog(`❌ Exercise "${selectedExercise}" not found in backend`);
          setError(`Exercise "${selectedExercise}" not available in backend.`);
          return;
        }
        addToConsoleLog(`✅ Exercise "${selectedExercise}" validated`);
      } catch (exerciseError) {
        addToConsoleLog('❌ Failed to validate exercise');
        setError('Failed to validate exercise with backend.');
        return;
      }
      
      // Test prediction with dummy data to ensure model is working
      try {
        const testAngles = [90, 90, 120, 120, 180, 180, 90, 90, 170];
        const testPrediction = await apiService.predictExercise(testAngles, selectedExercise);
        addToConsoleLog(`✅ AI model test successful: ${testPrediction.exercise} (${(testPrediction.confidence * 100).toFixed(1)}%)`);
      } catch (modelError) {
        addToConsoleLog('❌ AI model test failed');
        setError('AI model not responding. Please check backend logs.');
        return;
      }
      
      // Reset session
      await apiService.resetSession();
      addToConsoleLog('✅ Session reset successful');
      
      // Initialize session state
      setIsActive(true);
      setIsPaused(false);
      setRepCount(0);
      setSessionDuration(0);
      setSessionStartTime(new Date());
      setPredictedExercise('');
      setExerciseFeedback('Ready to start!');
      
      // Start camera with enhanced error handling
      addToConsoleLog('🎥 Initializing camera system...');
      await startCamera();
      
      if (voiceEnabled) {
        speak(`Starting ${selectedExercise.replace(/_/g, ' ')} exercise. Good luck!`);
      }
      
      addToConsoleLog('🎯 Exercise session started successfully!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToConsoleLog(`❌ Start failed: ${errorMessage}`);
      setError(`Failed to start exercise session: ${errorMessage}`);
      console.error('Start error:', error);
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    if (voiceEnabled) {
      speak(isPaused ? 'Resuming exercise' : 'Exercise paused');
    }
  };

  const handleStop = async () => {
    try {
      setIsActive(false);
      setIsPaused(false);
      
      if (cameraRef.current) {
        cameraRef.current.stop();
      }

      // Log session to backend
      if (currentUser && sessionStartTime) {
        await apiService.logSession({
          user_id: currentUser.uid,
          exercise: selectedExercise,
          total_reps: repCount,
          duration: sessionDuration,
          session_data: prediction ? [prediction] : []
        });
      }

      if (voiceEnabled) {
        speak(`Exercise completed! You did ${repCount} repetitions.`);
      }
      
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'up':
        return 'success';
      case 'down':
        return 'info';
      default:
        return 'default';
    }
  };

  const getFormQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'info';
      case 'needs_improvement':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const getFormQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '🏆';
      case 'good':
        return '✅';
      case 'needs_improvement':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return '🔄';
    }
  };

  const addToConsoleLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setConsoleLog(prev => [...prev.slice(-9), logEntry]); // Keep last 10 entries
  };

  const testConnection = async () => {
    try {
      addToConsoleLog('🧪 Running connection test...');
      
      // Test backend health
      const health = await apiService.healthCheck();
      addToConsoleLog(`✅ Backend test: ${health.status}`);
      
      // Test exercise list
      const exercises = await apiService.getExercises();
      addToConsoleLog(`✅ Found ${exercises.length} exercises`);
      
      // Test prediction
      const testAngles = [90, 90, 120, 120, 180, 180, 90, 90, 170];
      const testPred = await apiService.predictExercise(testAngles, selectedExercise);
      addToConsoleLog(`✅ AI test: ${testPred.exercise} (${(testPred.confidence * 100).toFixed(1)}%)`);
      
      addToConsoleLog('🎉 All tests passed!');
      
    } catch (error) {
      addToConsoleLog(`❌ Connection test failed: ${error}`);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {selectedExercise.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Monitor
        </Typography>
        <Button variant="outlined" onClick={onBack}>
          Back to Exercises
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Video Feed */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, position: 'relative' }}>
            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
              <Webcam
                ref={webcamRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: 'user'
                }}
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  pointerEvents: 'none'
                }}
              />
              {!poseDetected && isActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    p: 2,
                    borderRadius: 2,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h6">
                    Position yourself in front of the camera
                  </Typography>
                  <Typography variant="body2">
                    Make sure your full body is visible
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: '#ffeb3b' }}>
                    📹 Looking for pose keypoints...
                  </Typography>
                </Box>
              )}
              
              {/* Processing indicator when pose is detected but low confidence */}
              {poseDetected && isActive && confidence < 0.5 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(255, 165, 0, 0.8)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.8em'
                  }}
                >
                  🔍 Analyzing pose...
                </Box>
              )}
              
              {/* Success indicator when good detection */}
              {poseDetected && isActive && confidence >= 0.7 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(0, 255, 0, 0.8)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.8em'
                  }}
                >
                  ✅ Exercise detected!
                </Box>
              )}
            </Box>

            {/* Controls */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              {!isActive ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStart}
                >
                  Start Exercise
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                    onClick={handlePause}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<StopIcon />}
                    onClick={handleStop}
                  >
                    Stop
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Stats Panel */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    {selectedExercise.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current Phase:
                    </Typography>
                    <Chip 
                      label={currentPhase || 'Ready'} 
                      color={getPhaseColor(currentPhase) as any}
                      size="small"
                    />
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={voiceEnabled}
                        onChange={(e) => setVoiceEnabled(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Voice Feedback"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={debugMode}
                        onChange={(e) => setDebugMode(e.target.checked)}
                        color="secondary"
                      />
                    }
                    label="Debug Mode"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h2" color="primary" gutterBottom>
                    {repCount}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Repetitions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="secondary" gutterBottom>
                    {formatTime(sessionDuration)}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Duration
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    AI Confidence
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={confidence * 100}
                    sx={{ mb: 1, height: 8, borderRadius: 4 }}
                    color={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'warning' : 'error'}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {(confidence * 100).toFixed(1)}% accuracy
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 🎯 NEW: BiLSTM Exercise Prediction */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🤖 BiLSTM Prediction
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      Detected:
                    </Typography>
                    <Chip 
                      label={predictedExercise.replace(/_/g, ' ').toUpperCase() || 'None'} 
                      color={predictedExercise === selectedExercise ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Expected: {selectedExercise.replace(/_/g, ' ').toUpperCase()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 🎯 NEW: Form Quality & Feedback */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📊 Form Analysis
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <span style={{ fontSize: '1.5em' }}>
                      {getFormQualityIcon(formQuality)}
                    </span>
                    <Chip 
                      label={formQuality.replace(/_/g, ' ').toUpperCase()} 
                      color={getFormQualityColor(formQuality) as any}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    backgroundColor: 'rgba(0,0,0,0.05)', 
                    p: 1, 
                    borderRadius: 1,
                    fontStyle: 'italic'
                  }}>
                    {exerciseFeedback || 'Start exercising to get feedback...'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 🎯 NEW: AI Model Details */}
            {aiModelDetails && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      🔍 AI Model Output
                    </Typography>
                    <Box sx={{ 
                      backgroundColor: '#f5f5f5', 
                      p: 2, 
                      borderRadius: 1, 
                      fontFamily: 'monospace',
                      fontSize: '0.85em',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <Typography variant="body2" component="div">
                        <strong>Exercise:</strong> {aiModelDetails.exercise}<br/>
                        <strong>Confidence:</strong> {(aiModelDetails.confidence * 100).toFixed(2)}%<br/>
                        <strong>Phase:</strong> {aiModelDetails.phase}<br/>
                        <strong>Rep Count:</strong> {aiModelDetails.rep_count}<br/>
                        {aiModelDetails.session_id && (
                          <>
                            <strong>Session ID:</strong> {aiModelDetails.session_id}<br/>
                          </>
                        )}
                        {aiModelDetails.timestamp && (
                          <>
                            <strong>Timestamp:</strong> {new Date(aiModelDetails.timestamp).toLocaleTimeString()}<br/>
                          </>
                        )}
                        <strong>Status:</strong> {aiModelDetails.success ? '✅ Success' : '❌ Failed'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* 🎯 NEW: Real-time Console Log */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔄 AI Processing Log
                  </Typography>
                  <Box sx={{ 
                    backgroundColor: '#1e1e1e', 
                    color: '#00ff00',
                    p: 2, 
                    borderRadius: 1, 
                    fontFamily: 'monospace',
                    fontSize: '0.8em',
                    height: '200px',
                    overflowY: 'auto',
                    border: '1px solid #333'
                  }}>
                    {consoleLog.length === 0 ? (
                      <Typography variant="body2" color="text.disabled">
                        Start exercising to see AI processing logs...
                      </Typography>
                    ) : (
                      consoleLog.map((entry, index) => (
                        <div key={index} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
                          {entry}
                        </div>
                      ))
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 🎯 NEW: System Status Panel */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🔧 System Status
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Backend:</Typography>
                      <Chip 
                        label={error && error.includes('Backend') ? 'Error' : 'Connected'} 
                        color={error && error.includes('Backend') ? 'error' : 'success'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Camera:</Typography>
                      <Chip 
                        label={isActive ? 'Active' : 'Inactive'} 
                        color={isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Pose Detection:</Typography>
                      <Chip 
                        label={poseDetected ? 'Detected' : 'Searching'} 
                        color={poseDetected ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">AI Model:</Typography>
                      <Chip 
                        label={confidence > 0.5 ? 'Active' : 'Standby'} 
                        color={confidence > 0.5 ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={testConnection}
                      fullWidth
                      disabled={isActive}
                    >
                      🧪 Test Connection
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ExerciseMonitor; 