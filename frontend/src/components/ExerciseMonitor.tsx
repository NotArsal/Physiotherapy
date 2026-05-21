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
  Chip,
  Backdrop,
  CircularProgress
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import Webcam from 'react-webcam';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { apiService, PredictionResponse, ExerciseProtocol } from '../services/api';
import {
  extractJointAngles,
  speak,
  getRandomFeedback,
  getExerciseSpecificFeedback,
  getMilestoneFeedback,
  detectExercisePhase,
  detectInjuryRisk,
  InjuryRiskReport
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

  // ── EMA smoothing ──────────────────────────────────────────────────────────
  const smoothedAnglesRef = useRef<number[]>(Array(9).fill(0));
  const EMA_ALPHA = 0.55;

  // ── Tempo / phase-duration tracking ───────────────────────────────────────
  const phaseStartTimeRef = useRef<number>(0);          // when current phase began
  const lastPhaseChangeTimeRef = useRef<number>(0);     // when last completed phase ended
  const lastCompletedPhaseRef = useRef<string>('');     // phase that just finished
  const lastCompletedDurationRef = useRef<number>(0);   // duration (s) of that phase
  const lastTempoVoiceAtRef = useRef<number>(0);        // debounce for tempo voice

  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const [activeProtocol, setActiveProtocol] = useState<ExerciseProtocol | null>(null);
  const [injuryReport, setInjuryReport] = useState<InjuryRiskReport | null>(null);
  const [injuryFlags, setInjuryFlags] = useState(0);
  // Tempo UI states
  const [tempoStatus, setTempoStatus] = useState<'good' | 'too_fast' | 'too_slow' | 'idle'>('idle');
  const [lastPhaseDuration, setLastPhaseDuration] = useState<number>(0);
  const [currentPhaseDuration, setCurrentPhaseDuration] = useState<number>(0);

  const injuryFlagsRef = useRef(0);
  const previousLandmarksRef = useRef<any>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const activeProtocolRef = useRef<ExerciseProtocol | null>(null);
  const lastVoiceAlertAtRef = useRef(0);
  const historyBufferRef = useRef<any[]>([]);

  useEffect(() => {
    injuryFlagsRef.current = injuryFlags;
  }, [injuryFlags]);

  useEffect(() => {
    activeProtocolRef.current = activeProtocol;
  }, [activeProtocol]);

  const playSpeechCoaching = useCallback((text: string, force: boolean = false) => {
    if (!voiceEnabledRef.current) return;
    const now = Date.now();
    if (force || now - lastVoiceAlertAtRef.current > 4000) {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        speak(text);
        lastVoiceAlertAtRef.current = now;
      }
    }
  }, []);

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

  // ── Glowing neon skeleton renderer ─────────────────────────────────────────
  const drawGlowingSkeleton = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    warningText: string,
    isSafe: boolean
  ) => {
    if (!landmarks || landmarks.length < 33) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Determine per-landmark danger based on warning keywords
    const warnLow = warningText.toLowerCase();

    // Landmark index sets
    const kneesIdx = [25, 26];
    const anklesIdx = [27, 28];
    const elbowsIdx = [13, 14];
    const wristsIdx = [15, 16];
    const shouldersIdx = [11, 12];
    const hipsIdx = [23, 24];
    const spineIdx = [11, 12, 23, 24];

    const dangerIndices = new Set<number>();
    if (warnLow.includes('knee') || warnLow.includes('leg')) {
      kneesIdx.forEach(i => dangerIndices.add(i));
      anklesIdx.forEach(i => dangerIndices.add(i));
    }
    if (warnLow.includes('hand') || warnLow.includes('arm') || warnLow.includes('elbow')) {
      elbowsIdx.forEach(i => dangerIndices.add(i));
      wristsIdx.forEach(i => dangerIndices.add(i));
    }
    if (warnLow.includes('back') || warnLow.includes('spine') || warnLow.includes('shoulder')) {
      shouldersIdx.forEach(i => dangerIndices.add(i));
      spineIdx.forEach(i => dangerIndices.add(i));
    }
    if (warnLow.includes('hip') || warnLow.includes('full body')) {
      hipsIdx.forEach(i => dangerIndices.add(i));
    }
    if (!isSafe && dangerIndices.size === 0) {
      // Generic danger: highlight everything
      for (let i = 0; i < 33; i++) dangerIndices.add(i);
    }

    const safeColor = '#00E5FF';
    const dangerColor = '#FF1744';
    const safeBone = 'rgba(0, 229, 255, 0.75)';
    const dangerBone = 'rgba(255, 23, 68, 0.75)';

    // Draw bones (connections)
    POSE_CONNECTIONS.forEach(([a, b]) => {
      const lmA = landmarks[a];
      const lmB = landmarks[b];
      if (!lmA || !lmB) return;
      if (lmA.visibility < 0.35 || lmB.visibility < 0.35) return;
      const isDanger = dangerIndices.has(a) || dangerIndices.has(b);
      const color = isDanger ? dangerBone : safeBone;
      ctx.save();
      ctx.shadowColor = isDanger ? dangerColor : safeColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lmA.x * W, lmA.y * H);
      ctx.lineTo(lmB.x * W, lmB.y * H);
      ctx.stroke();
      ctx.restore();
    });

    // Draw joints
    landmarks.forEach((lm, i) => {
      if (!lm || lm.visibility < 0.35) return;
      const x = lm.x * W;
      const y = lm.y * H;
      const isDanger = dangerIndices.has(i);
      const color = isDanger ? dangerColor : safeColor;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, isDanger ? 6 : 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const onPoseResultsRef = useRef<(results: any) => Promise<void>>(async () => { });

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
        ctx.fillStyle = '#FF1744';
        ctx.font = 'bold 16px Inter, Arial';
        ctx.fillText('⚠ NO POSE DETECTED', 10, 30);
        return;
      }

      if (!poseDetectedRef.current) {
        setPoseDetected(true);
      }

      // Push to 30-frame rolling window of raw landmarks for temporal prediction
      if (results.poseLandmarks) {
        historyBufferRef.current.push(results.poseLandmarks);
        if (historyBufferRef.current.length > 30) {
          historyBufferRef.current.shift();
        }
      }

      // Draw neon skeleton using latest injury report for context
      try {
        const latestInjury = (window as any).__latestInjuryReport__;
        const warnText = latestInjury?.warnings?.join(' ') ?? '';
        const isSafe = latestInjury?.isSafe ?? true;
        drawGlowingSkeleton(ctx, results.poseLandmarks, warnText, isSafe);

        // Status label
        ctx.save();
        ctx.fillStyle = isSafe && !warnText ? '#00E5FF' : '#FF1744';
        ctx.font = 'bold 14px Inter, Arial';
        ctx.shadowColor = isSafe && !warnText ? '#00E5FF' : '#FF1744';
        ctx.shadowBlur = 8;
        ctx.fillText(isSafe && !warnText ? '✓ POSE DETECTED' : '⚠ FORM ALERT', 10, 28);
        ctx.restore();

        if (debugModeRef.current) {
          ctx.fillStyle = '#FFFF00';
          ctx.font = '12px monospace';
          ctx.fillText(`Landmarks: ${results.poseLandmarks.length}`, 10, 50);
        }
      } catch (drawError) {
        addToConsoleLog(`Drawing error: ${String(drawError)}`);
      }

      const now = Date.now();
      let deltaTime = 0;
      if (lastFrameTimeRef.current > 0) {
        deltaTime = (now - lastFrameTimeRef.current) / 1000;
      }
      lastFrameTimeRef.current = now;

      // Update live phase duration display every frame
      if (phaseStartTimeRef.current > 0) {
        setCurrentPhaseDuration(parseFloat(((now - phaseStartTimeRef.current) / 1000).toFixed(1)));
      }

      try {
        const rawAngles = extractJointAngles(results.poseLandmarks);
        if (rawAngles.length !== 9 || rawAngles.some((a) => a < 0 || a > 180 || Number.isNaN(a))) {
          return;
        }

        // ── EMA smoothing ────────────────────────────────────────────────────
        const prev = smoothedAnglesRef.current;
        const smoothed = rawAngles.map((v, i) => EMA_ALPHA * v + (1 - EMA_ALPHA) * prev[i]);
        smoothedAnglesRef.current = smoothed;
        const jointAngles = smoothed;

        // Proactive Injury Risk Detection
        const riskReport = detectInjuryRisk(
          results.poseLandmarks,
          jointAngles,
          selectedExerciseRef.current,
          activeProtocolRef.current,
          previousLandmarksRef.current,
          deltaTime
        );

        // Cache for skeleton renderer (runs on rAF loop, can't close over state)
        (window as any).__latestInjuryReport__ = riskReport;
        setInjuryReport(riskReport);
        previousLandmarksRef.current = results.poseLandmarks;

        if (riskReport.warnings.length > 0) {
          const primaryWarning = riskReport.warnings[0];

          if (!riskReport.isSafe) {
            const lastFlagKey = 'last_injury_flag_at';
            const lastFlag = (window as any)[lastFlagKey] || 0;
            if (now - lastFlag > 2000) {
              const newFlags = injuryFlagsRef.current + 1;
              setInjuryFlags(newFlags);
              (window as any)[lastFlagKey] = now;
            }
            playSpeechCoaching(`Caution: ${primaryWarning}`, true);
          } else {
            // General Posture / Exercise Correction voice feedback
            const lastCorrectionTime = (window as any)['last_correction_voiced_at'] || 0;
            const lastCorrectionText = (window as any)['last_correction_voiced_text'] || '';
            if (primaryWarning !== lastCorrectionText || now - lastCorrectionTime > 5000) {
              playSpeechCoaching(`Form correction: ${primaryWarning}`, false);
              (window as any)['last_correction_voiced_at'] = now;
              (window as any)['last_correction_voiced_text'] = primaryWarning;
            }
          }
        }

        if (now - lastPredictionAtRef.current < 300) {
          return;
        }

        lastPredictionAtRef.current = now;
        const predictionResult = await apiService.predictExercise(jointAngles, selectedExerciseRef.current, historyBufferRef.current);

        setPrediction(predictionResult);
        setConfidence(predictionResult.confidence);
        setPredictedExercise(predictionResult.exercise || 'unknown');
        setAiModelDetails(predictionResult);

        // Client-side phase detection and rep counting
        const previousPhase = currentPhaseRef.current || 'down';
        const newPhase = detectExercisePhase(jointAngles, selectedExerciseRef.current, previousPhase);

        if (newPhase !== 'hold' && previousPhase !== newPhase) {
          // ── Tempo analysis on phase transition ──────────────────────────
          const phaseDurationSec = phaseStartTimeRef.current > 0
            ? (now - phaseStartTimeRef.current) / 1000
            : 0;

          if (phaseDurationSec > 0.15) { // ignore noise
            lastCompletedPhaseRef.current = previousPhase;
            lastCompletedDurationRef.current = phaseDurationSec;
            setLastPhaseDuration(parseFloat(phaseDurationSec.toFixed(1)));

            // Tempo thresholds: eccentric (down) ≥ 1.2 s, concentric (up) ≥ 0.6 s
            const isEccentric = previousPhase === 'down';
            const minDuration = isEccentric ? 1.2 : 0.6;
            const isTooFast = phaseDurationSec < minDuration;
            const isTooSlow = phaseDurationSec > (isEccentric ? 5.0 : 3.5);

            if (isTooFast) {
              setTempoStatus('too_fast');
              if (now - lastTempoVoiceAtRef.current > 4000) {
                playSpeechCoaching(
                  isEccentric ? 'Slower! Control your descent.' : 'Slow down! Control the lift.',
                  false
                );
                lastTempoVoiceAtRef.current = now;
              }
            } else if (isTooSlow) {
              setTempoStatus('too_slow');
              if (now - lastTempoVoiceAtRef.current > 4000) {
                playSpeechCoaching('Keep moving! Don\'t rest mid-rep.', false);
                lastTempoVoiceAtRef.current = now;
              }
            } else {
              setTempoStatus('good');
            }
          }

          phaseStartTimeRef.current = now;
          setCurrentPhaseDuration(0);
          // ────────────────────────────────────────────────────────────────

          if (previousPhase === 'down' && newPhase === 'up') {
            const newRepCount = repCountRef.current + 1;
            setRepCount(newRepCount);

            // Play voice coach for milestones / normal reps
            const targetReps = activeProtocolRef.current?.target_reps ?? 10;
            if (newRepCount >= targetReps) {
              playSpeechCoaching(`Target reached! ${newRepCount} reps complete. Outstanding effort!`, true);
            } else {
              const feedback =
                newRepCount % 5 === 0 || newRepCount <= 3
                  ? getMilestoneFeedback(newRepCount)
                  : Math.random() > 0.5
                    ? getRandomFeedback('goodRep')
                    : getExerciseSpecificFeedback(selectedExerciseRef.current);
              playSpeechCoaching(feedback, false);
            }
          }
          setCurrentPhase(newPhase);
        } else if (newPhase === 'hold') {
          setCurrentPhase(newPhase);
        }

        const selectedNormalized = normalizeExerciseName(selectedExerciseRef.current);
        const predictedNormalized = normalizeExerciseName(predictionResult.exercise || '');
        const isCorrectExercise =
          predictedNormalized === selectedNormalized ||
          (selectedNormalized === 'glute_bridge' && predictedNormalized === 'hip_thrust') ||
          (selectedNormalized === 'clamshell' && predictedNormalized === 'leg_raises') ||
          (selectedNormalized === 'bird_dog' && predictedNormalized === 'plank') ||
          (selectedNormalized === 'wall_slide' && predictedNormalized === 'shoulder_press') ||
          (selectedNormalized === 'straight_leg_raise' && predictedNormalized === 'leg_raises') ||
          // OCCLUSION ALIASES for close-up seated views
          (selectedNormalized === 'lat_pulldown' && ['lat_pulldown', 'incline_bench_press', 'bench_press', 'pull_up', 'shoulder_press'].includes(predictedNormalized)) ||
          (selectedNormalized === 'pull_up' && ['pull_up', 'lat_pulldown', 'incline_bench_press', 'bench_press', 'shoulder_press'].includes(predictedNormalized)) ||
          (selectedNormalized === 'shoulder_press' && ['shoulder_press', 'wall_slide', 'pull_up', 'lat_pulldown'].includes(predictedNormalized)) ||
          (selectedNormalized === 'wall_slide' && ['wall_slide', 'shoulder_press', 'pull_up', 'lat_pulldown'].includes(predictedNormalized));

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

        // Voice feedback moved to the rep counting logic above
      } catch (processingError) {
        if (!poseDisposedRef.current) {
          addToConsoleLog(`Pose processing error: ${String(processingError)}`);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setLoading(true);
      setError('');
      addToConsoleLog('Initializing session...');
      historyBufferRef.current = []; // Clear history buffer for new session

      // Helper to normalize strings for comparison
      const normalize = (s: string) => s.trim().toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
      const targetExercise = normalize(selectedExercise);

      // Attempt to wake up backend (Retry logic)
      let healthy = false;
      let attempts = 0;
      while (!healthy && attempts < 3) {
        try {
          addToConsoleLog(`Waking up server (Attempt ${attempts + 1})...`);
          const health = await apiService.healthCheck();
          if (health.status === 'healthy') {
            healthy = true;
          }
        } catch (e) {
          attempts++;
          if (attempts >= 3) throw e;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }

      const availableExercises = await apiService.getExercises();
      const isAvailable = availableExercises.some(ex => normalize(ex) === targetExercise);

      if (!isAvailable) {
        setError(`Exercise "${selectedExercise}" not available in backend. Available: ${availableExercises.join(', ')}`);
        setLoading(false);
        return;
      }

      addToConsoleLog('Setting up exercise...');
      await apiService.resetSession();

      addToConsoleLog('Fetching exercise protocol...');
      let userProtocols: ExerciseProtocol[] = [];
      try {
        userProtocols = await apiService.getProtocol(currentUser?.uid || 'default');
      } catch (err) {
        addToConsoleLog('Failed to fetch protocol, using default.');
      }
      
      const normalizedSelected = targetExercise.toLowerCase().trim().replace(/[-\s]+/g, '_');
      const matchingProtocol = userProtocols.find(
        (p) => p.exercise.toLowerCase().trim().replace(/[-\s]+/g, '_') === normalizedSelected
      ) || null;
      
      setActiveProtocol(matchingProtocol);
      activeProtocolRef.current = matchingProtocol;
      
      if (matchingProtocol) {
        addToConsoleLog(`Loaded protocol: Target Reps = ${matchingProtocol.target_reps}, Safe Spine = ${matchingProtocol.safe_spine_angle}°, Safe Knee = ${matchingProtocol.safe_knee_angle}°, Sensitivity = ${matchingProtocol.safety_sensitivity}`);
      } else {
        addToConsoleLog('No custom protocol found. Using standard baseline thresholds.');
      }

      isActiveRef.current = true;
      isPausedRef.current = false;
      setIsActive(true);
      setIsPaused(false);
      setRepCount(0);
      repCountRef.current = 0;
      setInjuryFlags(0);
      injuryFlagsRef.current = 0;
      setInjuryReport(null);
      previousLandmarksRef.current = null;
      lastFrameTimeRef.current = 0;
      setSessionDuration(0);
      setSessionStartTime(new Date());
      setPredictedExercise('');
      predictedExerciseRef.current = '';
      setExerciseFeedback('Ready to start!');
      setPrediction(null);
      setAiModelDetails(null);
      setCurrentPhase('');
      currentPhaseRef.current = '';
      setPoseDetected(false);
      poseDetectedRef.current = false;
      lastPredictionAtRef.current = 0;
      // Reset EMA and tempo refs
      smoothedAnglesRef.current = Array(9).fill(0);
      phaseStartTimeRef.current = 0;
      lastPhaseChangeTimeRef.current = 0;
      lastCompletedPhaseRef.current = '';
      lastCompletedDurationRef.current = 0;
      lastTempoVoiceAtRef.current = 0;
      setTempoStatus('idle');
      setLastPhaseDuration(0);
      setCurrentPhaseDuration(0);
      (window as any).__latestInjuryReport__ = null;

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
    } finally {
      setLoading(false);
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
      historyBufferRef.current = []; // Clear history buffer on stop

      if (currentUser && sessionStartTime) {
        await apiService.logSession({
          user_id: currentUser.uid,
          exercise: selectedExercise,
          total_reps: repCountRef.current,
          duration: sessionDuration,
          session_data: [
            {
              final_rep_count: repCountRef.current,
              duration_seconds: sessionDuration,
              injury_flags: injuryFlagsRef.current,
              accuracy_score: prediction ? Math.round(prediction.confidence * 100) : 85,
              timestamp: new Date().toISOString()
            }
          ]
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
                  objectPosition: 'center',
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
                  objectFit: 'cover',
                  objectPosition: 'center',
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
                    textAlign: 'center',
                    zIndex: 5
                  }}
                >
                  <Typography variant="h6">Position yourself in front of the camera</Typography>
                  <Typography variant="body2">Make sure your full body is visible</Typography>
                </Box>
              )}

               {isActive && injuryReport && !injuryReport.isSafe && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(211, 47, 47, 0.95)',
                    color: 'white',
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 0 15px rgba(211, 47, 47, 0.8)',
                    zIndex: 10,
                    textAlign: 'center',
                    border: '2px solid #ff1744',
                    animation: 'pulse 1.5s infinite ease-in-out',
                    '@keyframes pulse': {
                      '0%': { opacity: 0.9, transform: 'translateX(-50%) scale(1)' },
                      '50%': { opacity: 1, transform: 'translateX(-50%) scale(1.03)', boxShadow: '0 0 25px rgba(255, 23, 68, 0.9)' },
                      '100%': { opacity: 0.9, transform: 'translateX(-50%) scale(1)' }
                    }
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    ⚠️ INJURY RISK DETECTED
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {injuryReport.warnings.join(' | ')}
                  </Typography>
                </Box>
              )}

              {isActive && injuryReport && injuryReport.isSafe && injuryReport.warnings.length > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(237, 108, 2, 0.95)',
                    color: 'white',
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 0 15px rgba(237, 108, 2, 0.8)',
                    zIndex: 10,
                    textAlign: 'center',
                    border: '2px solid #ff9800',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    ⚠️ FORM CORRECTION
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {injuryReport.warnings.join(' | ')}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              {!isActive ? (
                <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={handleStart} disabled={loading}>
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

            {/* Loading Overlay */}
            <Backdrop
              sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, position: 'absolute', flexDirection: 'column', gap: 2, borderRadius: '8px' }}
              open={loading}
            >
              <CircularProgress color="inherit" />
              <Typography variant="h6">Waking up server...</Typography>
              <Typography variant="body2">This may take up to 30 seconds on first load.</Typography>
            </Backdrop>
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

            {/* Live Tempo Guide widget */}
            <Grid item xs={12}>
              <Card sx={{
                borderLeft: tempoStatus === 'too_fast' ? '6px solid #FF1744'
                  : tempoStatus === 'too_slow' ? '6px solid #FF9800'
                  : tempoStatus === 'good' ? '6px solid #00E5FF'
                  : '6px solid #546E7A',
                background: tempoStatus === 'too_fast' ? 'rgba(255,23,68,0.06)'
                  : tempoStatus === 'too_slow' ? 'rgba(255,152,0,0.06)'
                  : 'inherit'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    ⏱ Live Tempo Guide
                    <Chip
                      label={
                        tempoStatus === 'too_fast' ? '⚡ Too Fast!' :
                        tempoStatus === 'too_slow' ? '🐢 Too Slow' :
                        tempoStatus === 'good' ? '✓ Good Pace' :
                        'Waiting...'
                      }
                      color={
                        tempoStatus === 'too_fast' ? 'error' :
                        tempoStatus === 'too_slow' ? 'warning' :
                        tempoStatus === 'good' ? 'success' :
                        'default'
                      }
                      size="small"
                    />
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Current phase:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {currentPhaseDuration > 0 ? `${currentPhaseDuration}s` : '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Last phase:</Typography>
                    <Typography variant="body2" fontWeight="bold"
                      sx={{ color: tempoStatus === 'too_fast' ? 'error.main' : tempoStatus === 'too_slow' ? 'warning.main' : 'text.primary' }}
                    >
                      {lastPhaseDuration > 0 ? `${lastPhaseDuration}s` : '—'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled">
                    Target: ≥1.2s eccentric (down) · ≥0.6s concentric (up)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ 
                borderLeft: injuryReport && !injuryReport.isSafe 
                  ? '6px solid #d32f2f' 
                  : injuryReport && injuryReport.warnings.length > 0
                    ? '6px solid #ed6c02' 
                    : '6px solid #4caf50' 
              }}>
                <CardContent>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    color={
                      injuryReport && !injuryReport.isSafe 
                        ? 'error' 
                        : injuryReport && injuryReport.warnings.length > 0
                          ? 'warning.main' 
                          : 'success.main'
                    }
                  >
                    Safety & Protocol Status
                  </Typography>
                  {activeProtocol ? (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Active Protocol: Target Reps = <strong>{activeProtocol.target_reps}</strong> | Spine Limit = <strong>{activeProtocol.safe_spine_angle}°</strong>
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Using default clinical thresholds.
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body2">Injury Risk Flags:</Typography>
                    <Chip
                      label={injuryFlags}
                      color={injuryFlags > 0 ? 'error' : 'success'}
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                  {injuryReport && !injuryReport.isSafe ? (
                    <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
                      <strong>Critical:</strong> {injuryReport.warnings.join(' | ')}
                    </Alert>
                  ) : injuryReport && injuryReport.warnings.length > 0 ? (
                    <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
                      <strong>Correction:</strong> {injuryReport.warnings.join(' | ')}
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ mt: 1.5, py: 0.5 }}>
                      Form looks perfect! Keep going.
                    </Alert>
                  )}
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
