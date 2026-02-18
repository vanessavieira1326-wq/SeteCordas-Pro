import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Square, Activity, Target, Clock, TrendingUp, AlertCircle, History, Trophy } from 'lucide-react';
import { getAudioContext, scheduleClick } from '../utils/audio';
import { PracticeSessionResult, PracticeHit } from '../types';

export const SmartTrainer: React.FC = () => {
  // --- STATE ---
  const [bpm, setBpm] = useState(90);
  const [isRecording, setIsRecording] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [sessionDurationBars, setSessionDurationBars] = useState(8);
  
  // Real-time Feedback
  const [currentOffset, setCurrentOffset] = useState<number | null>(null);
  const [lastHitQuality, setLastHitQuality] = useState<'perfect' | 'good' | 'bad' | null>(null);
  const [progress, setProgress] = useState(0);

  // Results
  const [lastResult, setLastResult] = useState<PracticeSessionResult | null>(null);
  const [history, setHistory] = useState<PracticeSessionResult[]>([]);

  // --- REFS ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  
  // Logic Refs
  const nextClickTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(0);
  const sessionHitsRef = useRef<PracticeHit[]>([]);
  const isRunningRef = useRef(false);
  const lastAttackTimeRef = useRef(0);

  // Constants
  const LOOKAHEAD = 25.0; // ms
  const SCHEDULE_AHEAD_TIME = 0.1; // s
  const ATTACK_THRESHOLD = 0.15; // Sensitivity for onset detection
  const DEBOUNCE_TIME = 0.15; // Minimum time between notes (s)

  // --- AUDIO SETUP ---
  const setupAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioContext();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // High res for timing
      analyserRef.current = analyser;

      const mic = ctx.createMediaStreamSource(stream);
      mic.connect(analyser);
      microphoneRef.current = mic;

      return true;
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Erro ao acessar microfone. Verifique as permissões.");
      return false;
    }
  };

  // --- ENGINE ---
  const startSession = async () => {
    if (!audioContextRef.current) {
        const success = await setupAudio();
        if (!success) return;
    }
    
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    // Reset
    sessionHitsRef.current = [];
    currentBeatRef.current = -4; // 1 Bar Count-in (assuming 4/4)
    nextClickTimeRef.current = ctx.currentTime + 0.1;
    setLastResult(null);
    setProgress(0);
    isRunningRef.current = true;
    setIsRecording(true);

    scheduler();
    analyzeInput();
  };

  const stopSession = () => {
    isRunningRef.current = false;
    setIsRecording(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    // Process Results
    if (sessionHitsRef.current.length > 0) {
        processResults();
    }
  };

  // --- METRONOME SCHEDULER ---
  const scheduler = () => {
    if (!isRunningRef.current) return;

    const ctx = getAudioContext();
    while (nextClickTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
        scheduleNote(currentBeatRef.current, nextClickTimeRef.current);
        
        // Advance Time
        const secondsPerBeat = 60.0 / bpm;
        nextClickTimeRef.current += secondsPerBeat;
        currentBeatRef.current++;
    }
    setTimeout(scheduler, LOOKAHEAD);
  };

  const scheduleNote = (beat: number, time: number) => {
      // Check for End of Session
      const totalBeats = sessionDurationBars * 4;
      if (beat >= totalBeats) {
          stopSession();
          return;
      }

      // Play Click (Count-in logic)
      if (beat < 0) {
          // Count-in clicks (High pitch)
          scheduleClick(time, 'sub');
      } else {
          // Session clicks
          scheduleClick(time, beat % 4 === 0 ? 'accent' : 'normal');
          
          // Update Progress Bar
          const percent = (beat / totalBeats) * 100;
          // Defer state update slightly
          setTimeout(() => setProgress(percent), (time - getAudioContext().currentTime) * 1000);
      }
  };

  // --- INPUT ANALYSIS (ONSET DETECTION) ---
  const analyzeInput = () => {
      if (!isRunningRef.current || !analyserRef.current) return;

      const buffer = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buffer);

      // Simple RMS calculation
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      const ctx = getAudioContext();

      // Detect Transient
      if (rms > ATTACK_THRESHOLD && (ctx.currentTime - lastAttackTimeRef.current) > DEBOUNCE_TIME) {
          // IGNORE hits during count-in
          if (currentBeatRef.current >= 0) {
              registerHit(ctx.currentTime);
              lastAttackTimeRef.current = ctx.currentTime;
          }
      }

      rafRef.current = requestAnimationFrame(analyzeInput);
  };

  const registerHit = (hitTime: number) => {
      // Find the closest expected beat time
      const secondsPerBeat = 60.0 / bpm;
      // We need to find the beat index that this hit likely belongs to.
      // nextClickTimeRef points to the *upcoming* beat.
      // So the previous beat was nextClickTimeRef - secondsPerBeat.
      
      const nextBeatTime = nextClickTimeRef.current;
      const prevBeatTime = nextClickTimeRef.current - secondsPerBeat;
      
      const diffNext = Math.abs(hitTime - nextBeatTime);
      const diffPrev = Math.abs(hitTime - prevBeatTime);
      
      let targetTime = diffNext < diffPrev ? nextBeatTime : prevBeatTime;
      let offset = (hitTime - targetTime) * 1000; // ms

      // Cap crazy offsets (mis-hits)
      if (Math.abs(offset) > (secondsPerBeat * 1000) / 2) return; // Not a relevant hit

      let quality: 'perfect' | 'good' | 'late' | 'early' = 'perfect';
      if (Math.abs(offset) < 25) quality = 'perfect';
      else if (Math.abs(offset) < 60) quality = 'good';
      else if (offset < 0) quality = 'early';
      else quality = 'late';

      const hit: PracticeHit = {
          timestamp: hitTime,
          offsetMs: offset,
          accuracy: quality === 'late' || quality === 'early' ? quality : quality === 'perfect' ? 'perfect' : 'good',
          beatNumber: currentBeatRef.current
      };

      sessionHitsRef.current.push(hit);
      
      // Update Realtime UI
      setCurrentOffset(offset);
      setLastHitQuality(quality as any);
      
      // Reset visual feedback after a bit
      setTimeout(() => setCurrentOffset(null), 500);
  };

  const processResults = () => {
      const hits = sessionHitsRef.current;
      if (hits.length === 0) return;

      const avgOffset = hits.reduce((sum, h) => sum + h.offsetMs, 0) / hits.length;
      const absOffsetSum = hits.reduce((sum, h) => sum + Math.abs(h.offsetMs), 0);
      const avgAbsOffset = absOffsetSum / hits.length;

      // Score Calculation (0-100)
      // 0ms error = 100 score. 100ms error = 0 score.
      const rawScore = Math.max(0, 100 - avgAbsOffset);
      
      // Stability: Standard Deviation-ish
      // How many hits were "Good" or "Perfect"?
      const goodHits = hits.filter(h => Math.abs(h.offsetMs) < 60).length;
      const stability = (goodHits / hits.length) * 100;

      let tendency: 'Acelerando' | 'Atrasando' | 'Estável' = 'Estável';
      if (avgOffset < -15) tendency = 'Acelerando';
      else if (avgOffset > 15) tendency = 'Atrasando';

      const result: PracticeSessionResult = {
          date: new Date().toLocaleTimeString(),
          bpm,
          score: Math.round(rawScore),
          avgOffset: Math.round(avgOffset),
          stability: Math.round(stability),
          tendency,
          hits
      };

      setLastResult(result);
      setHistory(prev => [result, ...prev]);
  };

  // --- RENDER HELPERS ---
  const renderLiveVisualizer = () => {
      // Linear Graph: Center is 0. Left is early (-100ms), Right is late (+100ms)
      const range = 120; // ms range visible
      let pinPosition = 50; // Percent
      
      if (currentOffset !== null) {
          const clamped = Math.max(-range, Math.min(range, currentOffset));
          pinPosition = 50 + ((clamped / range) * 50);
      }

      return (
          <div className="relative h-24 bg-slate-900 rounded-xl border border-slate-700 mb-6 overflow-hidden">
              {/* Grid Lines */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-green-500/50 z-10" /> {/* Perfect */}
              <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-slate-700 border-dashed border-l border-slate-600" />
              <div className="absolute left-3/4 top-0 bottom-0 w-[1px] bg-slate-700 border-dashed border-l border-slate-600" />
              
              {/* Labels */}
              <div className="absolute top-2 left-2 text-[10px] text-red-400 font-bold">ADIANTADO</div>
              <div className="absolute top-2 right-2 text-[10px] text-yellow-400 font-bold">ATRASADO</div>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-green-500 font-bold bg-slate-900 px-2">PERFEITO</div>

              {/* The "Pin" / Dot */}
              {currentOffset !== null && (
                  <div 
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg transition-all duration-75 z-20
                        ${lastHitQuality === 'perfect' ? 'bg-green-500 shadow-green-500/50' : lastHitQuality === 'good' ? 'bg-blue-400' : 'bg-red-500'}
                    `}
                    style={{ left: `calc(${pinPosition}% - 8px)` }}
                  >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-white bg-slate-800 px-1 rounded border border-slate-600">
                          {currentOffset > 0 ? '+' : ''}{Math.round(currentOffset)}ms
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderResultCard = () => {
      if (!lastResult) return null;
      return (
          <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-4">
                  <Trophy className="text-yellow-500" />
                  <h3 className="text-lg font-bold text-white">Relatório da Sessão</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-800 p-3 rounded-lg text-center">
                      <div className="text-xs text-slate-400 uppercase font-bold">Score</div>
                      <div className={`text-3xl font-black ${lastResult.score > 80 ? 'text-green-400' : lastResult.score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {lastResult.score}
                      </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg text-center">
                      <div className="text-xs text-slate-400 uppercase font-bold">Estabilidade</div>
                      <div className="text-2xl font-bold text-white">{lastResult.stability}%</div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg text-center">
                      <div className="text-xs text-slate-400 uppercase font-bold">Tendência</div>
                      <div className={`text-lg font-bold flex items-center justify-center gap-1 ${lastResult.tendency === 'Estável' ? 'text-green-400' : 'text-red-400'}`}>
                          {lastResult.tendency === 'Acelerando' && <TrendingUp className="rotate-45" size={16} />}
                          {lastResult.tendency === 'Atrasando' && <TrendingUp className="-rotate-45" size={16} />}
                          {lastResult.tendency}
                      </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg text-center">
                      <div className="text-xs text-slate-400 uppercase font-bold">Média Offset</div>
                      <div className="text-2xl font-bold text-white">{Math.abs(lastResult.avgOffset)}ms</div>
                  </div>
              </div>

              {/* Mini History Graph Simulation (Scatter) */}
              <div className="h-16 bg-slate-900 rounded border border-slate-700 relative flex items-center mb-2">
                  <div className="absolute w-full h-[1px] bg-green-500/20 top-1/2"></div>
                  {lastResult.hits.map((h, i) => (
                      <div 
                        key={i}
                        className={`absolute w-1.5 h-1.5 rounded-full ${Math.abs(h.offsetMs) < 30 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{
                            left: `${(i / lastResult.hits.length) * 100}%`,
                            top: `calc(50% + ${Math.max(-30, Math.min(30, h.offsetMs))}px)` // Clamp visual height
                        }}
                      />
                  ))}
              </div>
              <p className="text-[10px] text-center text-slate-500">Distribuição dos ataques (Acima=Atrasado, Abaixo=Adiantado)</p>
          </div>
      );
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="text-blue-400" />
                Treino Inteligente
            </h2>
            <p className="text-xs text-slate-400">Análise de groove e precisão rítmica em tempo real.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-700">
               <Clock size={16} className="text-slate-500" />
               <input 
                   type="number" 
                   value={bpm} 
                   onChange={(e) => setBpm(Math.min(200, Math.max(40, parseInt(e.target.value))))}
                   className="bg-transparent text-white font-mono w-12 text-center focus:outline-none"
                   disabled={isRecording}
               />
               <span className="text-xs font-bold text-slate-500">BPM</span>
          </div>
      </div>

      {/* Main Visualizer Area */}
      {renderLiveVisualizer()}

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mb-6 border border-slate-700">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          />
      </div>

      {/* Action Button */}
      {!lastResult && (
          <div className="flex justify-center mb-6">
            {!isRecording ? (
                <button
                    onClick={startSession}
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Mic size={24} /> Iniciar Avaliação
                </button>
            ) : (
                <button
                    onClick={stopSession}
                    className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-900/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Square fill="currentColor" size={24} /> Parar
                </button>
            )}
          </div>
      )}

      {/* Result Display */}
      {renderResultCard()}
      
      {/* Retry Button */}
      {lastResult && !isRecording && (
          <div className="flex justify-center mt-4">
               <button
                    onClick={startSession}
                    className="text-blue-400 hover:text-blue-300 font-bold text-sm flex items-center gap-2"
                >
                    <Activity size={16} /> Tentar Novamente
                </button>
          </div>
      )}

      {/* Tips */}
      <div className="mt-auto pt-6 border-t border-slate-700">
          <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
              <AlertCircle size={20} className="text-slate-500 mt-0.5" />
              <div className="text-xs text-slate-400">
                  <strong className="text-slate-300 block mb-1">Como funciona:</strong>
                  O sistema usa o microfone para detectar o ataque das notas graves.
                  Toque escalas ou uma levada de samba junto com o click. Tente acertar o tempo exato (linha verde).
                  O sistema gravará 8 compassos e gerará seu relatório.
              </div>
          </div>
      </div>

    </div>
  );
};
