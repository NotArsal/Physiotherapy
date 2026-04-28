import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import Webcam from 'react-webcam';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { apiService, PredictionResponse } from '../services/api';
import {
  extractJointAngles,
  speak,
  getRandomFeedback,
  getExerciseSpecificFeedback,
  getMilestoneFeedback
} from '../utils/poseDetection';
import { useAuth } from '../contexts/AuthContext';

interface ExerciseMonitorProps {
  selectedExercise: string;
  onBack: () => void;
}

const normalizeExerciseName = (value: string) => value.toLowerCase().replace(/[-\s]+/g, '_');

const ExerciseMonitor: React.FC<ExerciseMonitorProps> = ({ selectedExercise, onBack }) => {
  const { currentUser } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
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
  const [aiModelDetails, setAiModelDetails] = useState<PredictionResponse | null>(null);
  const [consoleLog, setConsoleLog] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);

  const addToConsoleLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setConsoleLog((previous) => [...previous.slice(-9), logEntry]);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, isPaused, sessionStartTime]);

  const onPoseResults = useCallback(async (results: any) => {
    if (!canvasRef.current || !isActive || isPaused) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
      if (poseDetected) {
        addToConsoleLog('Pose lost');
      }
      setPoseDetected(false);

      ctx.fillStyle = '#FF0000';
      ctx.font = '16px Arial';
      ctx.fillText('NO POSE DETECTED', 10, 30);
      return;
    }

    if (!poseDetected) {
      addToConsoleLog('Pose detected');
    }
    setPoseDetected(true);

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

      ctx.fillStyle = '#00FF00';
      ctx.font = '16px Arial';
      ctx.fillText('POSE DETECTED', 10, 30);

      if (debugMode) {
        ctx.fillStyle = '#FFFF00';
        ctx.font = '12px Arial';
        ctx.fillText(`Landmarks: ${results.poseLandmarks.length}`, 10, 50);
      }
    } catch (drawError) {
      console.error('Drawing error:', drawError);
      addToConsoleLog(`Drawing error: ${String(drawError)}`);
    }

    try {
      const jointAngles = extractJointAngles(results.poseLandmarks);
      if (jointAngles.length !== 9 || jointAngles.some((angle) => angle < 0 || angle > 180 || Number.isNaN(angle))) {
        addToConsoleLog('Skipping invalid joint-angle frame');
        return;
      }

      if (debugMode) {
        addToConsoleLog(`Joint angles: ${jointAngles.map((angle) => angle.toFixed(1)).join(', ')}`);
      }

      const predictionResult = await apiService.predictExercise(jointAngles, selectedExercise);
      if (predictionResult.error) {
        addToConsoleLog(predictionResult.error);
      }

      if (Math.abs(predictionResult.confidence - confidence) > 0.1 || predictionResult.exercise !== predictedExercise) {
        addToConsoleLog(
          `Model: ${predictionResult.exercise} (${(predictionResult.confidence * 100).toFixed(1)}%)`
        );
      }

      setPrediction(predictionResult);
      setRepCount(predictionResult.rep_count);
      setCurrentPhase(predictionResult.phase);
      setConfidence(predictionResult.confidence);
      setPredictedExercise(predictionResult.exercise || 'unknown');
      setAiModelDetails(predictionResult);

      const isCorrectExercise =
        normalizeExerciseName(predictionResult.exercise || '') === normalizeExerciseName(selectedExercise);

      if (predictionResult.confidence >= 0.85 && isCorrectExercise) {
        setFormQuality('excellent');
        setExerciseFeedback('Perfect form! Keep it up!');
      } else if (predictionResult.confidence >= 0.7 && isCorrectExercise) {
        setFormQuality('good');
        setExerciseFeedback('Good form! Stay focused on your movement.');
      } else if (predictionResult.confidence >= 0.5) {
        setFormQuality('needs_improvement');
        setExerciseFeedback(
          isCorrectExercise
            ? 'Form needs improvement. Focus on proper technique.'
            : `AI detected ${predictionResult.exercise?.replace(/_/g, ' ')} instead of ${selectedExercise.replace(/_/g, ' ')}`
        );
      } else {
        setFormQuality('poor');
        setExerciseFeedback('Low confidence detection. Check your positioning.');
      }

      if (predictionResult.rep_count > repCount) {
        addToConsoleLog(`Rep count: ${repCount} -> ${predictionResult.rep_count}`);
      }

      if (predictionResult.phase !== currentPhase) {
        addToConsoleLog(`Phase: ${currentPhase || 'ready'} -> ${predictionResult.phase}`);
      }

      if (voiceEnabled && predictionResult.rep_count > repCount) {
        const feedback =
          predictionResult.rep_count % 5 === 0 || predictionResult.rep_count <= 3
            ? getMilestoneFeedback(predictionResult.rep_count)
            : Math.random() > 0.5
              ? getRandomFeedback('goodRep')
              : getExerciseSpecificFeedback(selectedExercise);
        speak(feedback);
      }
    } catch (processingError) {
      console.error('Error processing pose results:', processingError);
      addToConsoleLog(`Pose processing error: ${String(processingError)}`);
    }
  }, [
    addToConsoleLog,
    confidence,
    currentPhase,
    debugMode,
    isActive,
    isPaused,
    poseDetected,
    predictedExercise,
    repCount,
    selectedExercise,
    voiceEnabled
  ]);

  useEffect(() => {
    const initializePose = async () => {
      try {
        addToConsoleLog('Initializing MediaPipe Pose...');
        setError('');

        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
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
        addToConsoleLog('MediaPipe Pose initialized successfully');
      } catch (initError) {
        console.error('Error initializing pose detection:', initError);
        setError('Failed to initialize pose detection. Please refresh the page.');
        addToConsoleLog('MediaPipe initialization failed');
      }
    };

    const timer = window.setTimeout(initializePose, 100);

    return () => {
      window.clearTimeout(timer);
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [addToConsoleLog, onPoseResults]);

  useEffect(() => {
    if (poseRef.current) {
      poseRef.current.onResults(onPoseResults);
    }
  }, [onPoseResults]);

  const startCamera = useCallback(async () => {
    try {
      addToConsoleLog('Starting camera...');

      if (!webcamRef.current?.video) {
        setError('Camera not available. Please allow camera permissions.');
        addToConsoleLog('Webcam video element not found');
        return false;
      }

      if (!poseRef.current) {
        setError('Pose detection not ready. Please refresh the page.');
        addToConsoleLog('MediaPipe Pose not initialized');
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const video = webcamRef.current.video;

      if (video.paused) {
        await video.play();
      }

      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || 640;
        canvasRef.current.height = video.videoHeight || 480;
      }

      const camera = new Camera(video, {
        onFrame: async () => {
          if (webcamRef.current?.video && poseRef.current && isActive && !isPaused) {
            await poseRef.current.send({ image: webcamRef.current.video });
          }
        },
        width: video.videoWidth || 640,
        height: video.videoHeight || 480
      });

      cameraRef.current = camera;
      await camera.start();
      addToConsoleLog('Camera started successfully');
      return true;
    } catch (cameraError) {
      console.error('Camera start error:', cameraError);
      addToConsoleLog(`Camera error: ${String(cameraError)}`);
      setError('Failed to start camera. Please check permissions and refresh.');
      return false;
    }
  }, [addToConsoleLog, isActive, isPaused]);

  const handleStart = async () => {
    try {
      setError('');
      addToConsoleLog('Starting exercise session...');

      const health = await apiService.healthCheck();
      addToConsoleLog(`Backend healthy: ${health.status}`);

      const exercises = await apiService.getExercises();
      if (!exercises.includes(selectedExercise)) {
        setError(`Exercise "${selectedExercise}" not available in backend.`);
        addToConsoleLog(`Exercise "${selectedExercise}" not found in backend`);
        return;
      }

      const testAngles = [90, 90, 120, 120, 180, 180, 90, 90, 170];
      const testPrediction = await apiService.predictExercise(testAngles, selectedExercise);
      addToConsoleLog(`Model test successful: ${testPrediction.exercise}`);

      await apiService.resetSession();

      setIsActive(true);
      setIsPaused(false);
      setRepCount(0);
      setSessionDuration(0);
      setSessionStartTime(new Date());
      setPredictedExercise('');
      setExerciseFeedback('Ready to start!');
      setPrediction(null);
      setAiModelDetails(null);
      setCurrentPhase('');

      const started = await startCamera();
      if (!started) {
        setIsActive(false);
        return;
      }

      if (voiceEnabled) {
        speak(`Starting ${selectedExercise.replace(/_/g, ' ')} exercise. Good luck!`);
      }

      addToConsoleLog('Exercise session started successfully');
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : 'Unknown error';
      addToConsoleLog(`Start failed: ${message}`);
      setError(`Failed to start exercise session: ${message}`);
      setIsActive(false);
      console.error('Start error:', startError);
    }
  };

  const handlePause = () => {
    setIsPaused((previous) => !previous);
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
        cameraRef.current = null;
      }

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

      addToConsoleLog('Session stopped');
    } catch (stopError) {
      console.error('Error stopping session:', stopError);
      addToConsoleLog(`Stop error: ${String(stopError)}`);
    }
  };

  const testConnection = async () => {
    try {
      addToConsoleLog('Running connection test...');
      const health = await apiService.healthCheck();
      addToConsoleLog(`Backend test: ${health.status}`);

      const exercises = await apiService.getExercises();
      addToConsoleLog(`Found ${exercises.length} exercises`);

      const testAngles = [90, 90, 120, 120, 180, 180, 90, 90, 170];
      const testPrediction = await apiService.predictExercise(testAngles, selectedExercise);
      addToConsoleLog(`AI test: ${testPrediction.exercise} (${(testPrediction.confidence * 100).toFixed(1)}%)`);
    } catch (testError) {
      addToConsoleLog(`Connection test failed: ${String(testError)}`);
    }
  };

  const formatTime = (seconds: number) => {
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
        return 'Strong';
      case 'good':
        return 'Good';
      case 'needs_improvement':
        return 'Adjust';
      case 'poor':
        return 'Check';
      default:
        return 'Ready';
    }
  };

  const backendStatus = error.toLowerCase().includes('backend') ? 'Error' : 'Connected';
  const expectedExercise = selectedExercise.replace(/_/g, ' ').toUpperCase();
  const detectedExercise = predictedExercise ? predictedExercise.replace(/_/g, ' ').toUpperCase() : 'NONE';

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {selectedExercise.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())} Monitor
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
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, position: 'relative' }}>
            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
              <Webcam
                ref={webcamRef}
                audio={false}
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
                  <Typography variant="h6">Position yourself in front of the camera</Typography>
                  <Typography variant="body2">Make sure your full body is visible</Typography>
                </Box>
              )}

              {poseDetected && isActive && confidence < 0.5 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(255, 165, 0, 0.85)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.8em'
                  }}
                >
                  Analyzing pose...
                </Box>
              )}

              {poseDetected && isActive && confidence >= 0.7 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(0, 160, 0, 0.85)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.8em'
                  }}
                >
                  Exercise detected
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              {!isActive ? (
                <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={handleStart}>
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
                  <Button variant="outlined" size="large" startIcon={<StopIcon />} onClick={handleStop}>
                    Stop
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    {selectedExercise.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current Phase:
                    </Typography>
                    <Chip
                      label={currentPhase || 'Ready'}
                      color={getPhaseColor(currentPhase) as 'success' | 'info' | 'default'}
                      size="small"
                    />
                  </Box>
                  <FormControlLabel
                    control={<Switch checked={voiceEnabled} onChange={(event) => setVoiceEnabled(event.target.checked)} />}
                    label="Voice Feedback"
                  />
                  <FormControlLabel
                    control={<Switch checked={debugMode} onChange={(event) => setDebugMode(event.target.checked)} color="secondary" />}
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
                    {(confidence * 100).toFixed(1)}% confidence
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    BiLSTM Prediction
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      Detected:
                    </Typography>
                    <Chip
                      label={detectedExercise}
                      color={
                        normalizeExerciseName(predictedExercise || '') === normalizeExerciseName(selectedExercise)
                          ? 'success'
                          : 'warning'
                      }
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Expected: {expectedExercise}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Form Analysis
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip label={getFormQualityIcon(formQuality)} variant="outlined" size="small" />
                    <Chip
                      label={formQuality.replace(/_/g, ' ').toUpperCase()}
                      color={getFormQualityColor(formQuality) as 'success' | 'info' | 'warning' | 'error' | 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ backgroundColor: 'rgba(0,0,0,0.05)', p: 1, borderRadius: 1, fontStyle: 'italic' }}
                  >
                    {exerciseFeedback || 'Start exercising to get feedback...'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {aiModelDetails && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      AI Model Output
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: '#f5f5f5',
                        p: 2,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85em',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}
                    >
                      <Typography variant="body2" component="div">
                        <strong>Exercise:</strong> {aiModelDetails.exercise}
                        <br />
                        <strong>Confidence:</strong> {(aiModelDetails.confidence * 100).toFixed(2)}%
                        <br />
                        <strong>Phase:</strong> {aiModelDetails.phase}
                        <br />
                        <strong>Rep Count:</strong> {aiModelDetails.rep_count}
                        <br />
                        {aiModelDetails.timestamp && (
                          <>
                            <strong>Timestamp:</strong> {new Date(aiModelDetails.timestamp).toLocaleTimeString()}
                            <br />
                          </>
                        )}
                        <strong>Status:</strong> {aiModelDetails.success === false ? 'Failed' : 'Success'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    AI Processing Log
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: '#1e1e1e',
                      color: '#00ff00',
                      p: 2,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.8em',
                      height: '200px',
                      overflowY: 'auto',
                      border: '1px solid #333'
                    }}
                  >
                    {consoleLog.length === 0 ? (
                      <Typography variant="body2" color="text.disabled">
                        Start exercising to see AI processing logs...
                      </Typography>
                    ) : (
                      consoleLog.map((entry, index) => (
                        <div key={`${entry}-${index}`} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
                          {entry}
                        </div>
                      ))
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Status
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Backend:</Typography>
                      <Chip label={backendStatus} color={backendStatus === 'Error' ? 'error' : 'success'} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Camera:</Typography>
                      <Chip label={isActive ? 'Active' : 'Inactive'} color={isActive ? 'success' : 'default'} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Pose Detection:</Typography>
                      <Chip label={poseDetected ? 'Detected' : 'Searching'} color={poseDetected ? 'success' : 'warning'} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">AI Model:</Typography>
                      <Chip label={confidence > 0.5 ? 'Active' : 'Standby'} color={confidence > 0.5 ? 'success' : 'default'} size="small" />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" size="small" onClick={testConnection} fullWidth disabled={isActive}>
                      Test Connection
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
