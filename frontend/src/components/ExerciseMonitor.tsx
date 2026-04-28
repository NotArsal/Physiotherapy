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

const waitForVideoReady = async (video: HTMLVideoElement, timeoutMs = 10000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
};

const stopVideoStream = (video: HTMLVideoElement | null | undefined) => {
  if (!video) {
    return;
  }

  const mediaStream = video.srcObject;
  if (mediaStream instanceof MediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
};

const ExerciseMonitor: React.FC<ExerciseMonitorProps> = ({ selectedExercise, onBack }) => {
  const { currentUser } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const poseDisposedRef = useRef(false);
  const poseProcessingRef = useRef(false);
  const lastPredictionAtRef = useRef(0);
  const repCountRef = useRef(0);
  const currentPhaseRef = useRef('');
  const predictedExerciseRef = useRef('');
  const selectedExerciseRef = useRef(selectedExercise);
  const voiceEnabledRef = useRef(true);
  const debugModeRef = useRef(false);
  const poseDetectedRef = useRef(false);

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
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    repCountRef.current = repCount;
  }, [repCount]);

  useEffect(() => {
    currentPhaseRef.current = currentPhase;
  }, [currentPhase]);

  useEffect(() => {
    predictedExerciseRef.current = predictedExercise;
  }, [predictedExercise]);

  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  useEffect(() => {
    poseDetectedRef.current = poseDetected;
  }, [poseDetected]);

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

  const stopFrameLoop = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    poseProcessingRef.current = false;
  }, []);

  const stopCameraStream = useCallback(() => {
    stopVideoStream(webcamRef.current?.video);
  }, []);

  const onPoseResultsRef = useRef<(results: any) => Promise<void>>(async () => {});

  useEffect(() => {
    onPoseResultsRef.current = async (results: any) => {
      if (!canvasRef.current || !isActiveRef.current || isPausedRef.current) {
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
        if (poseDetectedRef.current) {
          setPoseDetected(false);
        }
        ctx.fillStyle = '#FF0000';
        ctx.font = '16px Arial';
        ctx.fillText('NO POSE DETECTED', 10, 30);
        return;
      }

      if (!poseDetectedRef.current) {
        setPoseDetected(true);
      }

      try {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
        ctx.fillStyle = '#00FF00';
        ctx.font = '16px Arial';
        ctx.fillText('POSE DETECTED', 10, 30);

        if (debugModeRef.current) {
          ctx.fillStyle = '#FFFF00';
          ctx.font = '12px Arial';
          ctx.fillText(`Landmarks: ${results.poseLandmarks.length}`, 10, 50);
        }
      } catch (drawError) {
        addToConsoleLog(`Drawing error: ${String(drawError)}`);
      }

      const now = Date.now();
      if (now - lastPredictionAtRef.current < 300) {
        return;
      }

      try {
        const jointAngles = extractJointAngles(results.poseLandmarks);
        if (jointAngles.length !== 9 || jointAngles.some((angle) => angle < 0 || angle > 180 || Number.isNaN(angle))) {
          return;
        }

        lastPredictionAtRef.current = now;
        const predictionResult = await apiService.predictExercise(jointAngles, selectedExerciseRef.current);

        setPrediction(predictionResult);
        setRepCount(predictionResult.rep_count);
        setCurrentPhase(predictionResult.phase);
        setConfidence(predictionResult.confidence);
        setPredictedExercise(predictionResult.exercise || 'unknown');
        setAiModelDetails(predictionResult);

        const isCorrectExercise =
          normalizeExerciseName(predictionResult.exercise || '') === normalizeExerciseName(selectedExerciseRef.current);

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
              : `AI detected ${predictionResult.exercise?.replace(/_/g, ' ')} instead of ${selectedExerciseRef.current.replace(/_/g, ' ')}`
          );
        } else {
          setFormQuality('poor');
          setExerciseFeedback('Low confidence detection. Check your positioning.');
        }

        if (voiceEnabledRef.current && predictionResult.rep_count > repCountRef.current) {
          const feedback =
            predictionResult.rep_count % 5 === 0 || predictionResult.rep_count <= 3
              ? getMilestoneFeedback(predictionResult.rep_count)
              : Math.random() > 0.5
                ? getRandomFeedback('goodRep')
                : getExerciseSpecificFeedback(selectedExerciseRef.current);
          speak(feedback);
        }
      } catch (processingError) {
        if (!poseDisposedRef.current) {
          addToConsoleLog(`Pose processing error: ${String(processingError)}`);
        }
      }
    };
  }, [addToConsoleLog]);

  useEffect(() => {
    const initializePose = async () => {
      try {
        setError('');
        addToConsoleLog('Initializing MediaPipe Pose...');
        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        poseDisposedRef.current = false;

        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5
        });

        pose.onResults((results) => {
          void onPoseResultsRef.current(results);
        });

        poseRef.current = pose;
        addToConsoleLog('MediaPipe Pose initialized successfully');
      } catch (initError) {
        setError('Failed to initialize pose detection. Please refresh the page.');
        addToConsoleLog(`MediaPipe initialization failed: ${String(initError)}`);
      }
    };

    const timer = window.setTimeout(() => {
      void initializePose();
    }, 100);

    return () => {
      window.clearTimeout(timer);
      stopFrameLoop();
      stopCameraStream();
      poseDisposedRef.current = true;
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [addToConsoleLog, stopCameraStream, stopFrameLoop]);

  const startFrameLoop = useCallback(() => {
    const tick = async () => {
      if (!isActiveRef.current || isPausedRef.current || poseDisposedRef.current) {
        frameRequestRef.current = requestAnimationFrame(() => {
          void tick();
        });
        return;
      }

      const video = webcamRef.current?.video;
      const pose = poseRef.current;

      if (video && pose && !poseProcessingRef.current) {
        poseProcessingRef.current = true;
        try {
          await pose.send({ image: video });
        } catch (sendError) {
          if (!poseDisposedRef.current) {
            addToConsoleLog(`Pose send error: ${String(sendError)}`);
          }
        } finally {
          poseProcessingRef.current = false;
        }
      }

      frameRequestRef.current = requestAnimationFrame(() => {
        void tick();
      });
    };

    stopFrameLoop();
    frameRequestRef.current = requestAnimationFrame(() => {
      void tick();
    });
  }, [addToConsoleLog, stopFrameLoop]);

  const startCamera = useCallback(async () => {
    try {
      addToConsoleLog('Starting camera...');

      if (!webcamRef.current?.video) {
        setError('Camera not available. Please allow camera permissions.');
        return false;
      }

      if (!poseRef.current) {
        setError('Pose detection not ready. Please refresh the page.');
        return false;
      }

      poseDisposedRef.current = false;
      const video = webcamRef.current.video;

      if (video.paused) {
        await video.play();
      }

      const ready = await waitForVideoReady(video);
      if (!ready) {
        setError('Camera stream did not become ready in time. Please allow camera access and try again.');
        return false;
      }

      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || 640;
        canvasRef.current.height = video.videoHeight || 480;
      }

      startFrameLoop();
      addToConsoleLog(`Video ready: ${video.videoWidth}x${video.videoHeight}`);
      return true;
    } catch (cameraError) {
      setError('Failed to start camera. Please check permissions and refresh.');
      addToConsoleLog(`Camera error: ${String(cameraError)}`);
      return false;
    }
  }, [addToConsoleLog, startFrameLoop]);

  const handleStart = async () => {
    try {
      setError('');
      const health = await apiService.healthCheck();
      addToConsoleLog(`Backend healthy: ${health.status}`);

      const exercises = await apiService.getExercises();
      if (!exercises.includes(selectedExercise)) {
        setError(`Exercise "${selectedExercise}" not available in backend.`);
        return;
      }

      await apiService.resetSession();

      isActiveRef.current = true;
      isPausedRef.current = false;
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
      setPoseDetected(false);
      lastPredictionAtRef.current = 0;

      const started = await startCamera();
      if (!started) {
        isActiveRef.current = false;
        setIsActive(false);
        return;
      }

      if (voiceEnabledRef.current) {
        speak(`Starting ${selectedExercise.replace(/_/g, ' ')} exercise. Good luck!`);
      }
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : 'Unknown error';
      setError(`Failed to start exercise session: ${message}`);
      isActiveRef.current = false;
      setIsActive(false);
    }
  };

  const handlePause = () => {
    const nextPaused = !isPausedRef.current;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);
    if (voiceEnabledRef.current) {
      speak(nextPaused ? 'Exercise paused' : 'Resuming exercise');
    }
  };

  const handleStop = async () => {
    try {
      isActiveRef.current = false;
      isPausedRef.current = false;
      setIsActive(false);
      setIsPaused(false);
      stopFrameLoop();
      stopCameraStream();

      if (currentUser && sessionStartTime) {
        await apiService.logSession({
          user_id: currentUser.uid,
          exercise: selectedExercise,
          total_reps: repCountRef.current,
          duration: sessionDuration,
          session_data: prediction ? [prediction] : []
        });
      }

      if (voiceEnabledRef.current) {
        speak(`Exercise completed! You did ${repCountRef.current} repetitions.`);
      }
    } catch (stopError) {
      addToConsoleLog(`Stop error: ${String(stopError)}`);
    }
  };

  const testConnection = async () => {
    try {
      addToConsoleLog('Running connection test...');
      const health = await apiService.healthCheck();
      addToConsoleLog(`Backend test: ${health.status}`);
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
                    <Chip label={currentPhase || 'Ready'} color={getPhaseColor(currentPhase) as any} size="small" />
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
                  <Chip
                    label={formQuality.replace(/_/g, ' ').toUpperCase()}
                    color={getFormQualityColor(formQuality) as any}
                    size="small"
                    sx={{ mb: 2 }}
                  />
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
                        fontSize: '0.85em'
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
