import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Mic, MicOff, CheckCircle } from 'lucide-react';
import { STANDARD_STRINGS, SEVENTH_STRING_OPTIONS } from '../constants';
import { SeventhStringTuning } from '../types';
import { playTone, playSuccessSound, getAudioContext } from '../utils/audio';
import { autoCorrelate, noteFromPitch } from '../utils/pitchDetection';

interface TunerProps {
  currentTuning: SeventhStringTuning;
  onTuningChange: (tuning: SeventhStringTuning) => void;
}

export const Tuner: React.FC<TunerProps> = ({ currentTuning, onTuningChange }) => {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  
  // Auto Mode State
  const [listening, setListening] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [centsOff, setCentsOff] = useState<number>(0);
  const [closestStringIndex, setClosestStringIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // References for locking logic
  const lastValidPitchRef = useRef<number>(0);
  const inTuneStartTimeRef = useRef<number | null>(null);
  const hasPlayedSuccessRef = useRef<boolean>(false);

  const strings = [...STANDARD_STRINGS, SEVENTH_STRING_OPTIONS[currentTuning]];

  // Cleanup on unmount or mode switch
  useEffect(() => {
    return () => stopListening();
  }, [mode]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = getAudioContext();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096; // Increased buffer size for better bass resolution
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      setListening(true);
      detectPitch();
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Acesso ao microfone negado ou não disponível.");
      setMode('manual');
    }
  };

  const stopListening = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (sourceRef.current) {
        sourceRef.current.disconnect(); 
    }
    setListening(false);
    setDetectedPitch(null);
    setClosestStringIndex(null);
    setIsLocked(false);
    hasPlayedSuccessRef.current = false;
    inTuneStartTimeRef.current = null;
  };

  const detectPitch = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const rawPitch = autoCorrelate(buffer, audioContextRef.current.sampleRate);

    // FILTER LOGIC:
    // 1. Valid range check (50Hz - 400Hz covers 7-string B0/A0 to High E)
    // 2. Proximity check to known strings
    let validPitch = null;
    
    if (rawPitch > 50 && rawPitch < 400) {
        // Check if it's close to any string (within ~1.5 semitones)
        // 1.5 semitones ratio is approx 1.09
        const isGuitarSound = strings.some(str => {
            const ratio = rawPitch / str.frequency;
            // +/- 150 cents range logic
            // 2^(150/1200) = 1.0905
            // 2^(-150/1200) = 0.917
            return ratio > 0.91 && ratio < 1.09;
        });

        if (isGuitarSound) {
            validPitch = rawPitch;
        }
    }

    if (validPitch) {
      setDetectedPitch(validPitch);
      lastValidPitchRef.current = validPitch;
      
      // Find closest string
      let minDiff = Infinity;
      let closestIdx = -1;

      strings.forEach((str, idx) => {
        const diff = Math.abs(validPitch! - str.frequency);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      if (closestIdx !== -1) {
        setClosestStringIndex(closestIdx);
        const targetString = strings[closestIdx];
        
        // Calculate Cents
        const cents = 1200 * Math.log(validPitch / targetString.frequency) / Math.log(2);
        const roundedCents = Math.round(cents);
        setCentsOff(roundedCents);

        // SUCCESS SOUND LOGIC
        // Strict threshold: +/- 4 cents
        if (Math.abs(roundedCents) <= 4) {
            if (inTuneStartTimeRef.current === null) {
                inTuneStartTimeRef.current = Date.now();
            } else {
                const duration = Date.now() - inTuneStartTimeRef.current;
                // Require 300ms of stability
                if (duration > 300 && !hasPlayedSuccessRef.current) {
                    playSuccessSound(targetString.frequency); // Pass the guitar note frequency
                    hasPlayedSuccessRef.current = true;
                    setIsLocked(true);
                }
            }
        } else {
            // Reset if we drift out
            inTuneStartTimeRef.current = null;
            hasPlayedSuccessRef.current = false;
            setIsLocked(false);
        }
      }
    } else {
        // Simplified: if rawPitch is -1 (silence), clear.
        if (rawPitch === -1) {
            setClosestStringIndex(null);
            setDetectedPitch(null);
            inTuneStartTimeRef.current = null;
            hasPlayedSuccessRef.current = false;
            setIsLocked(false);
        }
    }

    rafIdRef.current = requestAnimationFrame(detectPitch);
  };

  const toggleMode = () => {
    if (mode === 'manual') {
      setMode('auto');
      startListening();
    } else {
      stopListening();
      setMode('manual');
    }
  };

  const handleManualPlay = (freq: number, index: number) => {
    if (mode === 'auto') return;
    playTone(freq);
    setPlayingIndex(index);
    setTimeout(() => setPlayingIndex(null), 2000);
  };

  // Render Meter
  const renderMeter = () => {
    if (mode === 'manual') return null;

    const isTune = Math.abs(centsOff) < 5;
    const color = isLocked ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : isTune ? 'text-green-500' : Math.abs(centsOff) < 20 ? 'text-yellow-500' : 'text-red-500';
    
    // Clamp rotation
    const needleRotation = Math.max(-45, Math.min(45, centsOff)); 

    return (
      <div className={`
        bg-slate-900 rounded-xl p-6 mb-6 flex flex-col items-center justify-center relative overflow-hidden border transition-colors duration-300
        ${isLocked ? 'border-green-500 shadow-[0_0_20px_rgba(74,222,128,0.2)]' : 'border-slate-700'}
      `}>
        <div className="text-sm text-slate-500 mb-2 uppercase tracking-widest">Frequência Detectada</div>
        <div className={`text-5xl font-bold mb-4 transition-all duration-200 ${listening && detectedPitch ? color : 'text-slate-700'}`}>
          {listening && detectedPitch && closestStringIndex !== null ? strings[closestStringIndex].note : '--'}
        </div>
        
        {/* Gauge */}
        <div className="relative w-64 h-32 flex justify-center overflow-hidden">
          {/* Arc */}
          <div className="absolute bottom-0 w-full h-full border-t-[20px] border-slate-700 rounded-t-full"></div>
          
          {/* Center Marker */}
          <div className={`absolute bottom-0 w-1 h-4 z-10 ${isLocked ? 'bg-green-400 box-shadow-glow' : 'bg-green-500/50'}`}></div>

          {/* Needle */}
          <div 
            className={`absolute bottom-0 left-1/2 w-1 h-full bg-slate-200 origin-bottom transition-transform duration-100 ease-linear ${!detectedPitch ? 'opacity-20' : ''}`}
            style={{ transform: `translateX(-50%) rotate(${needleRotation}deg)` }}
          >
             <div className={`w-4 h-4 rounded-full -ml-1.5 mt-2 ${color} transition-colors duration-200`}></div>
          </div>
        </div>

        <div className="flex justify-between w-full max-w-xs mt-2 text-xs font-mono text-slate-500">
          <span>Grave</span>
          <span className={`font-bold transition-all duration-300 ${isLocked ? "text-green-400 scale-125" : isTune ? "text-green-500" : "opacity-0"}`}>
            {isLocked ? "AFINADO!" : "PERFEITO"}
          </span>
          <span>Agudo</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-yellow-500 flex items-center gap-2">
          <span>🎸</span> Afinador
        </h2>
        
        {/* Tuning Selector & Mode Toggle */}
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleMode}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${mode === 'auto' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
                {mode === 'auto' ? <Mic size={14}/> : <MicOff size={14}/>}
                {mode === 'auto' ? 'Auto' : 'Manual'}
            </button>

            <select 
                value={currentTuning}
                onChange={(e) => onTuningChange(e.target.value as SeventhStringTuning)}
                className="bg-slate-900 text-slate-200 border border-slate-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-yellow-500 max-w-[120px]"
            >
                {Object.values(SeventhStringTuning).map((t) => (
                <option key={t} value={t}>{t}</option>
                ))}
            </select>
        </div>
      </div>

      {renderMeter()}

      <div className="space-y-2 flex-1 overflow-y-auto">
        {strings.map((str, idx) => {
          const stringNumber = idx + 1;
          const isPlaying = playingIndex === idx;
          const isDetected = mode === 'auto' && closestStringIndex === idx;

          return (
            <div 
              key={idx}
              onClick={() => handleManualPlay(str.frequency, idx)}
              className={`
                group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200
                ${isDetected ? (isLocked ? 'bg-green-500/30 border-green-400' : 'bg-green-500/20 border-green-500') : ''}
                ${isDetected ? 'scale-[1.02]' : ''}
                ${isPlaying ? 'bg-yellow-500/20 border-yellow-500/50' : !isDetected ? 'bg-slate-900/50 border-slate-700 hover:bg-slate-700/50' : 'border-slate-700'}
                border
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-200
                  ${isDetected ? (isLocked ? 'bg-green-400 text-slate-900' : 'bg-green-500 text-white') : isPlaying ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'}
                `}>
                  {stringNumber}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold transition-colors duration-200 ${isDetected ? (isLocked ? 'text-green-300' : 'text-green-400') : isPlaying ? 'text-yellow-400' : 'text-white'}`}>
                      {str.note}
                    </span>
                    <span className="text-xs text-slate-500">{str.octave}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-400 text-sm hidden sm:block">{str.frequency.toFixed(2)} Hz</span>
                {mode === 'manual' && (
                    <Volume2 size={18} className={`${isPlaying ? 'text-yellow-400 animate-pulse' : 'text-slate-600'}`} />
                )}
                {mode === 'auto' && isDetected && (
                    <CheckCircle size={18} className={`transition-colors duration-200 ${isLocked ? 'text-green-400 fill-green-400/20' : 'text-green-500'}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};