import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import Webcam from 'react-webcam';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { extractJointAngles } from '../utils/poseDetection';

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

const MediaPipeDebug: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const poseDisposedRef = useRef(false);
  const poseProcessingRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [poseDetected, setPoseDetected] = useState(false);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [jointAngles, setJointAngles] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showConnections, setShowConnections] = useState(true);

  const stopLoop = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    poseProcessingRef.current = false;
  }, []);

  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current) {
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
      setPoseDetected(false);
      setLandmarkCount(0);
      setConfidence(0);
      setJointAngles([]);
      setDebugInfo(null);
      return;
    }

    setPoseDetected(true);
    setLandmarkCount(results.poseLandmarks.length);

    const avgConfidence =
      results.poseLandmarks.reduce((sum: number, landmark: any) => sum + (landmark.visibility || 0), 0) /
      results.poseLandmarks.length;
    setConfidence(avgConfidence);

    if (showConnections) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
    }

    if (showLandmarks) {
      drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
    }

    try {
      setJointAngles(extractJointAngles(results.poseLandmarks));
    } catch (angleError) {
      console.error('Error extracting joint angles:', angleError);
    }

    setDebugInfo({
      landmarkCount: results.poseLandmarks.length,
      avgConfidence,
      imageSize: results.image ? { width: results.image.width, height: results.image.height } : null
    });
  }, [showConnections, showLandmarks]);

  useEffect(() => {
    const initializePose = async () => {
      try {
        setError('');
        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        poseDisposedRef.current = false;

        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.4,
          minTrackingConfidence: 0.4
        });

        pose.onResults(onPoseResults);
        poseRef.current = pose;
        setIsLoading(false);
      } catch (initError) {
        console.error('Error initializing pose detection:', initError);
        setError(`Failed to initialize pose detection: ${String(initError)}`);
        setIsLoading(false);
      }
    };

    void initializePose();

    return () => {
      stopLoop();
      poseDisposedRef.current = true;
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [onPoseResults, stopLoop]);

  const startLoop = useCallback(() => {
    const tick = async () => {
      if (poseDisposedRef.current) {
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
            console.error('Pose frame send error:', sendError);
          }
        } finally {
          poseProcessingRef.current = false;
        }
      }

      frameRequestRef.current = requestAnimationFrame(() => {
        void tick();
      });
    };

    stopLoop();
    frameRequestRef.current = requestAnimationFrame(() => {
      void tick();
    });
  }, [stopLoop]);

  const startCamera = useCallback(async () => {
    try {
      setError('');
      if (!poseRef.current) {
        throw new Error('Pose not initialized');
      }
      if (!webcamRef.current?.video) {
        throw new Error('Webcam video element not available');
      }

      poseDisposedRef.current = false;
      const video = webcamRef.current.video;
      if (video.paused) {
        await video.play();
      }

      const ready = await waitForVideoReady(video);
      if (!ready) {
        throw new Error('Camera stream did not become ready in time');
      }

      startLoop();
      setIsActive(true);
    } catch (cameraError) {
      console.error('Error starting camera:', cameraError);
      setError(`Failed to start camera: ${String(cameraError)}`);
    }
  }, [startLoop]);

  const stopCamera = useCallback(() => {
    stopLoop();
    setIsActive(false);
    setPoseDetected(false);
  }, [stopLoop]);

  const resetTest = useCallback(() => {
    stopCamera();
    setError('');
    setPoseDetected(false);
    setLandmarkCount(0);
    setConfidence(0);
    setJointAngles([]);
    setDebugInfo(null);
  }, [stopCamera]);

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>
        MediaPipe Debug Console
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This tool helps diagnose MediaPipe pose detection issues and verify keypoint tracking.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Status</Typography>
              <Chip label={isLoading ? 'Loading' : isActive ? 'Active' : 'Inactive'} color={isLoading ? 'default' : isActive ? 'success' : 'default'} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Pose Detection</Typography>
              <Chip label={poseDetected ? 'Detected' : 'Not Detected'} color={poseDetected ? 'success' : 'error'} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Landmarks</Typography>
              <Typography variant="h4">{landmarkCount}</Typography>
              <Typography variant="caption">Expected: 33</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Confidence</Typography>
              <Typography variant="h4">{(confidence * 100).toFixed(1)}%</Typography>
              <LinearProgress variant="determinate" value={confidence * 100} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" color="primary" onClick={startCamera} disabled={isLoading || isActive}>
            Start Camera
          </Button>

          <Button variant="contained" color="secondary" onClick={stopCamera} disabled={!isActive}>
            Stop Camera
          </Button>

          <Button variant="outlined" onClick={resetTest}>
            Reset
          </Button>

          <FormControlLabel
            control={<Switch checked={showLandmarks} onChange={(event) => setShowLandmarks(event.target.checked)} />}
            label="Show Landmarks"
          />

          <FormControlLabel
            control={<Switch checked={showConnections} onChange={(event) => setShowConnections(event.target.checked)} />}
            label="Show Connections"
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Webcam Feed
            </Typography>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                width={640}
                height={480}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: 'user'
                }}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              MediaPipe Output
            </Typography>
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#000'
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {debugInfo && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Debug Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Landmark Details</Typography>
              <Typography variant="body2">Count: {debugInfo.landmarkCount}</Typography>
              <Typography variant="body2">Avg Confidence: {(debugInfo.avgConfidence * 100).toFixed(1)}%</Typography>
              {debugInfo.imageSize && (
                <Typography variant="body2">
                  Image Size: {debugInfo.imageSize.width} x {debugInfo.imageSize.height}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Joint Angles</Typography>
              <Typography variant="body2" component="div">
                {jointAngles.length > 0 ? (
                  <Box>
                    {[
                      'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
                      'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Spine'
                    ].map((joint, index) => (
                      <div key={joint}>
                        {joint}: {jointAngles[index]?.toFixed(1) || 'N/A'} deg
                      </div>
                    ))}
                  </Box>
                ) : (
                  'No angles calculated'
                )}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default MediaPipeDebug;
