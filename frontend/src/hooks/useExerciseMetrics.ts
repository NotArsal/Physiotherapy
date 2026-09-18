import { useState, useRef, useCallback } from 'react';
import { detectExercisePhase, getMilestoneFeedback, getRandomFeedback, getExerciseSpecificFeedback } from '../utils/poseDetection';

export const useExerciseMetrics = (
  selectedExercise: string, 
  targetReps: number, 
  playSpeechCoaching: (text: string, force?: boolean) => void,
  playTempoFeedback: (type: 'too_fast' | 'too_slow' | 'fatigue', isEccentric: boolean) => void
) => {
  const [repCount, setRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [tempoStatus, setTempoStatus] = useState<'good' | 'too_fast' | 'too_slow' | 'idle'>('idle');
  const [lastPhaseDuration, setLastPhaseDuration] = useState<number>(0);
  const [currentPhaseDuration, setCurrentPhaseDuration] = useState<number>(0);

  const phaseStartTimeRef = useRef<number>(0);
  const currentPhaseRef = useRef<string>('');
  const concentricDurationsRef = useRef<number[]>([]);
  const eccentricDurationsRef = useRef<number[]>([]);

  // Sync state with ref
  const setCurrentPhaseState = useCallback((phase: string) => {
    setCurrentPhase(phase);
    currentPhaseRef.current = phase;
  }, []);

  const updateMetrics = useCallback((
    jointAngles: number[], 
    now: number
  ) => {
    const previousPhase = currentPhaseRef.current || 'down';
    const newPhase = detectExercisePhase(jointAngles, selectedExercise, previousPhase);

    // Update live phase duration
    if (phaseStartTimeRef.current > 0) {
      const dur = parseFloat(((now - phaseStartTimeRef.current) / 1000).toFixed(1));
      if (Math.abs(dur - currentPhaseDuration) >= 0.2) {
        setCurrentPhaseDuration(dur);
      }
    }

    if (newPhase !== 'hold' && previousPhase !== newPhase) {
      const phaseDurationSec = phaseStartTimeRef.current > 0
        ? (now - phaseStartTimeRef.current) / 1000
        : 0;

      if (phaseDurationSec > 0.15) { // Ignore noise
        setLastPhaseDuration(parseFloat(phaseDurationSec.toFixed(1)));

        // Tempo thresholds
        const isEccentric = previousPhase === 'down';
        const minDuration = isEccentric ? 1.2 : 0.6;
        const isTooFast = phaseDurationSec < minDuration;
        const isTooSlow = phaseDurationSec > (isEccentric ? 5.0 : 3.5);

        if (isTooFast) {
          setTempoStatus('too_fast');
          playTempoFeedback('too_fast', isEccentric);
        } else if (isTooSlow) {
          setTempoStatus('too_slow');
          playTempoFeedback('too_slow', isEccentric);
        } else {
          setTempoStatus('good');
        }

        // Fatigue Detection Logic
        if (isEccentric) {
          eccentricDurationsRef.current.push(phaseDurationSec);
        } else {
          concentricDurationsRef.current.push(phaseDurationSec);
          if (concentricDurationsRef.current.length > 3) {
            const baseline = concentricDurationsRef.current.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
            if (phaseDurationSec > baseline * 1.30) {
              playTempoFeedback('fatigue', isEccentric);
            }
          }
        }
      }

      phaseStartTimeRef.current = now;
      setCurrentPhaseDuration(0);

      // Rep counting
      if (previousPhase === 'down' && newPhase === 'up') {
        setRepCount(prev => {
          const newRepCount = prev + 1;
          
          if (newRepCount >= targetReps) {
            playSpeechCoaching(`Target reached! ${newRepCount} reps complete. Outstanding effort!`, true);
          } else {
            const feedback = newRepCount % 5 === 0 || newRepCount <= 3
                ? getMilestoneFeedback(newRepCount)
                : Math.random() > 0.5
                  ? getRandomFeedback('goodRep')
                  : getExerciseSpecificFeedback(selectedExercise);
            playSpeechCoaching(feedback, false);
          }
          return newRepCount;
        });
      }
      
      setCurrentPhaseState(newPhase);
    } else if (newPhase === 'hold') {
      setCurrentPhaseState(newPhase);
    }
  }, [
    selectedExercise, 
    targetReps, 
    currentPhaseDuration, 
    playSpeechCoaching, 
    playTempoFeedback, 
    setCurrentPhaseState
  ]);

  return {
    repCount,
    currentPhase,
    tempoStatus,
    lastPhaseDuration,
    currentPhaseDuration,
    updateMetrics,
    phaseStartTimeRef,
    setRepCount
  };
};
