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
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { extractJointAngles } from '../utils/poseDetection';

const MediaPipeDebug: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);

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
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      });
    }

    if (showLandmarks) {
      drawLandmarks(ctx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 1,
        radius: 3
      });
    }

    try {
      const angles = extractJointAngles(results.poseLandmarks);
      setJointAngles(angles);
    } catch (angleError) {
      console.error('Error extracting joint angles:', angleError);
    }

    setDebugInfo({
      landmarkCount: results.poseLandmarks.length,
      avgConfidence,
      firstLandmark: results.poseLandmarks[0],
      lastLandmark: results.poseLandmarks[results.poseLandmarks.length - 1],
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

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3
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

    initializePose();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [onPoseResults]);

  useEffect(() => {
    if (poseRef.current) {
      poseRef.current.onResults(onPoseResults);
    }
  }, [onPoseResults]);

  const startCamera = useCallback(async () => {
    try {
      setError('');

      if (!poseRef.current) {
        throw new Error('Pose not initialized');
      }

      if (!webcamRef.current?.video) {
        throw new Error('Webcam video element not available');
      }

      await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video && poseRef.current) {
            await poseRef.current.send({ image: webcamRef.current.video });
          }
        },
        width: 640,
        height: 480
      });

      cameraRef.current = camera;
      await camera.start();
      setIsActive(true);
    } catch (cameraError) {
      console.error('Error starting camera:', cameraError);
      setError(`Failed to start camera: ${String(cameraError)}`);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    setIsActive(false);
    setPoseDetected(false);
  }, []);

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

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Troubleshooting Tips
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Ensure good lighting and a clear view of your full body.</li>
          <li>Make sure webcam permissions are granted.</li>
          <li>Try refreshing the page if MediaPipe fails to load.</li>
          <li>Check the browser console for detailed error messages.</li>
          <li>Verify internet access for MediaPipe CDN resources.</li>
          <li>Stand 3 to 6 feet away from the camera for best detection.</li>
          <li>Wear clothing that contrasts with the background.</li>
        </Box>
      </Paper>
    </Container>
  );
};

export default MediaPipeDebug;
