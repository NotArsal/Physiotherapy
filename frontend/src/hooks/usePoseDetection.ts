import { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { initWasm } from '../utils/poseDetection';

interface PoseDetectionResult {
  poseLandmarks: any[];
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
}

export const usePoseDetection = (
  isActive: boolean,
  isPaused: boolean,
  onPoseResults: (results: PoseDetectionResult) => Promise<void>,
  videoRef: MutableRefObject<HTMLVideoElement | null>
) => {
  const poseRef = useRef<PoseLandmarker | null>(null);
  const frameRequestRef = useRef<number | null>(null);
  const poseDisposedRef = useRef(false);
  
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  
  useEffect(() => {
    isActiveRef.current = isActive;
    isPausedRef.current = isPaused;
  }, [isActive, isPaused]);

  const onPoseResultsRef = useRef(onPoseResults);
  useEffect(() => {
    onPoseResultsRef.current = onPoseResults;
  }, [onPoseResults]);

  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Initialize MediaPipe and Rust Wasm
  const initializePose = useCallback(async () => {
    try {
      setError('');
      console.log('Initializing MediaPipe PoseLandmarker and Wasm Core...');
      
      // Load Rust Wasm Biomechanics
      await initWasm();

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      const poseLandmarker = await PoseLandmarker.createFromModelPath(
        vision,
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
      );
      
      poseDisposedRef.current = false;

      poseLandmarker.setOptions({
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6,
        minTrackingConfidence: 0.5
      });

      poseRef.current = poseLandmarker;
      setIsReady(true);
      console.log('MediaPipe PoseLandmarker initialized successfully');
    } catch (initError) {
      setError('Failed to initialize pose detection. Please check your connection and refresh.');
      console.error(`MediaPipe initialization failed: ${String(initError)}`);
    }
  }, []);

  const stopFrameLoop = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
  }, []);

  // Frame Loop
  const startFrameLoop = useCallback(() => {
    let lastVideoTime = -1;

    const tick = async () => {
      // Use refs to avoid closure staleness
      if (!isActiveRef.current || isPausedRef.current || poseDisposedRef.current || !poseRef.current) {
        frameRequestRef.current = requestAnimationFrame(tick);
        return;
      }

      const videoElement = videoRef.current;
      if (!videoElement || videoElement.readyState < 2) {
        frameRequestRef.current = requestAnimationFrame(tick);
        return;
      }

      if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        try {
          const startTimeMs = performance.now();
          const results = poseRef.current.detectForVideo(videoElement, startTimeMs);
          if (results) {
            // Emulate the object shape expected by the consumer
            await onPoseResultsRef.current({
              poseLandmarks: results.landmarks && results.landmarks.length > 0 ? results.landmarks[0] : [],
              image: videoElement
            });
          }
        } catch (err) {
          console.error("Error during pose detection tick:", err);
          // If the WebGL context is actually lost, MediaPipe throws here.
          if (err instanceof Error && err.message.toLowerCase().includes('webgl')) {
             setError('GPU Context Lost. Please refresh the page.');
             stopFrameLoop();
             return;
          }
        }
      }

      frameRequestRef.current = requestAnimationFrame(tick);
    };

    if (frameRequestRef.current === null) {
      frameRequestRef.current = requestAnimationFrame(tick);
    }
  }, [videoRef, stopFrameLoop]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initializePose();
    }, 100);

    return () => {
      window.clearTimeout(timer);
      stopFrameLoop();
      poseDisposedRef.current = true;
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [initializePose, stopFrameLoop]);

  useEffect(() => {
    if (isReady && isActive && !isPaused) {
      startFrameLoop();
    }
  }, [isReady, isActive, isPaused, startFrameLoop]);

  return { error, isReady, stopFrameLoop };
};
