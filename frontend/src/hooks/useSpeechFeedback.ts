import { useCallback, useRef, useEffect } from 'react';
import { speak } from '../utils/poseDetection';

export const useSpeechFeedback = (voiceEnabled: boolean) => {
  const voiceEnabledRef = useRef(voiceEnabled);
  const lastVoiceAlertAtRef = useRef(0);
  const lastCorrectionVoicedAtRef = useRef(0);
  const lastCorrectionVoicedTextRef = useRef('');
  const lastTempoVoiceAtRef = useRef(0);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const playSpeechCoaching = useCallback((text: string, force: boolean = false) => {
    if (!voiceEnabledRef.current) return;
    const now = Date.now();
    const cooldown = force ? 3000 : 4500;
    
    if (now - lastVoiceAlertAtRef.current > cooldown) {
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          speak(text);
          lastVoiceAlertAtRef.current = now;
        } catch (err) {
          console.error('Speech synthesis failed:', err);
        }
      }
    }
  }, []);

  const playFormCorrection = useCallback((warning: string) => {
    const now = Date.now();
    const isVisibilityWarning = warning.toLowerCase().includes('not visible') || 
                                warning.toLowerCase().includes('occluded');
                                
    if (!isVisibilityWarning) {
      const lastCorrectionTime = lastCorrectionVoicedAtRef.current;
      const lastCorrectionText = lastCorrectionVoicedTextRef.current;
      
      if (warning !== lastCorrectionText || now - lastCorrectionTime > 5000) {
        playSpeechCoaching(`Form correction: ${warning}`, false);
        lastCorrectionVoicedAtRef.current = now;
        lastCorrectionVoicedTextRef.current = warning;
      }
    }
  }, [playSpeechCoaching]);

  const playTempoFeedback = useCallback((type: 'too_fast' | 'too_slow' | 'fatigue', isEccentric: boolean) => {
    const now = Date.now();
    const cooldown = type === 'fatigue' ? 8000 : 4000;
    
    if (now - lastTempoVoiceAtRef.current > cooldown) {
      let message = '';
      if (type === 'too_fast') {
        message = isEccentric ? 'Slower! Control your descent.' : 'Slow down! Control the lift.';
      } else if (type === 'too_slow') {
        message = 'Keep moving! Don\'t rest mid-rep.';
      } else if (type === 'fatigue') {
        message = 'You\'re slowing down. Push through the fatigue!';
      }
      
      playSpeechCoaching(message, false);
      lastTempoVoiceAtRef.current = now;
    }
  }, [playSpeechCoaching]);

  return {
    playSpeechCoaching,
    playFormCorrection,
    playTempoFeedback
  };
};
