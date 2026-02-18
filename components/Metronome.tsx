import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, Settings2, Zap, Ghost } from 'lucide-react';
import { RHYTHM_PRESETS } from '../constants';
import { RhythmStyle, TimeSignature, Subdivision } from '../types';
import { scheduleClick, getAudioContext, setMasterVolume } from '../utils/audio';

interface MetronomeProps {
  selectedRhythm: RhythmStyle;
  onRhythmChange: (rhythm: RhythmStyle) => void;
}

export const Metronome: React.FC<MetronomeProps> = ({ selectedRhythm, onRhythmChange }) => {
  // --- State ---
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');
  const [subdivision, setSubdivision] = useState<Subdivision>('1');
  
  // Modes
  const [isGrooveMode, setIsGrooveMode] = useState(false); // Beats 2 & 4 only
  const [isGhostMode, setIsGhostMode] = useState(false); // Randomly drops bars

  // Visuals
  const [currentBeat, setCurrentBeat] = useState(1);
  const [flash, setFlash] = useState(false);

  // --- Scheduler Refs (Audio Engine) ---
  const nextNoteTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const beatCounterRef = useRef<number>(0); // Global counter
  const ghostBarRef = useRef<boolean>(false); // Is current bar muted?
  
  // Refs for Real-time updates inside the scheduler loop
  const bpmRef = useRef(bpm);
  const timeSigRef = useRef(timeSig);
  const subdivisionRef = useRef(subdivision);

  // Sync Refs
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { timeSigRef.current = timeSig; }, [timeSig]);
  useEffect(() => { subdivisionRef.current = subdivision; }, [subdivision]);

  // Sync state with Rhythm Preset changes
  useEffect(() => {
    const preset = RHYTHM_PRESETS.find(r => r.name === selectedRhythm);
    if (preset && !isPlaying) {
      setBpm(preset.bpmRanges.intermediate);
      if (selectedRhythm === RhythmStyle.CHORO || selectedRhythm === RhythmStyle.SAMBA) setTimeSig('2/4');
      else setTimeSig('4/4');
    }
  }, [selectedRhythm, isPlaying]);

  // Volume Effect
  useEffect(() => {
    setMasterVolume(volume);
  }, [volume]);

  // --- Scheduler Logic ---
  const LOOKAHEAD = 25.0; // How frequently to call scheduling function (in milliseconds)
  const SCHEDULE_AHEAD_TIME = 0.1; // How far ahead to schedule audio (in seconds)

  const nextNote = () => {
    // Use the Ref to get the latest BPM even inside the closure
    const secondsPerBeat = 60.0 / bpmRef.current;
    
    // Advance time logic...
    // Note: Technically duration changes slightly if subdivision changes mid-beat, 
    // but for metronome stability we rely on the BPM ref mainly.
    // The nextNoteTime is absolute, so changing subdivision just changes the increment size.
    
    const sub = subdivisionRef.current;
    if (sub === '1') nextNoteTimeRef.current += secondsPerBeat;
    else if (sub === '2') nextNoteTimeRef.current += secondsPerBeat / 2;
    else if (sub === '3') nextNoteTimeRef.current += secondsPerBeat / 3;
    else if (sub === '4') nextNoteTimeRef.current += secondsPerBeat / 4;
    
    beatCounterRef.current++;
  };

  const scheduleNotes = (beatNumber: number, time: number) => {
    // Determine Time Signature Math using REFS
    const currentTS = timeSigRef.current;
    const currentSub = subdivisionRef.current;

    let beatsPerBar = 4;
    if (currentTS === '2/4') beatsPerBar = 2;
    if (currentTS === '3/4') beatsPerBar = 3;
    if (currentTS === '6/8') beatsPerBar = 6;

    // Subdivisions per beat logic
    let subDivs = 1;
    if (currentSub === '2') subDivs = 2;
    if (currentSub === '3') subDivs = 3;
    if (currentSub === '4') subDivs = 4;

    const totalSubBeatsPerBar = beatsPerBar * subDivs;
    const currentSubBeatInBar = beatNumber % totalSubBeatsPerBar;
    
    // Convert to musical beat (1-based)
    const currentMainBeat = Math.floor(currentSubBeatInBar / subDivs) + 1;
    const isDownbeat = currentSubBeatInBar === 0; // The '1' of the bar
    const isMainBeatStart = currentSubBeatInBar % subDivs === 0;

    // --- GHOST MODE LOGIC ---
    if (isDownbeat) {
        if (isGhostMode) {
            ghostBarRef.current = Math.random() < 0.25;
        } else {
            ghostBarRef.current = false;
        }
    }

    // --- SOUND LOGIC ---
    if (!ghostBarRef.current) {
        let playType: 'accent' | 'normal' | 'sub' | 'mute' = 'sub';
        
        if (isMainBeatStart) {
            // It is a main beat (1, 2, 3...)
            if (isDownbeat) {
                playType = 'accent'; // The '1'
            } else {
                playType = 'normal';
            }

            // --- GROOVE MODE LOGIC ---
            if (isGrooveMode && beatsPerBar === 4) {
                if (currentMainBeat === 1 || currentMainBeat === 3) {
                    playType = 'mute';
                } else {
                    playType = 'accent'; // Make 2 and 4 pop
                }
            } else if (isGrooveMode && beatsPerBar === 2) {
                 // Samba feel: Accent 2
                 if (currentMainBeat === 1) playType = 'mute';
                 else playType = 'accent';
            }
        }

        // Send to Audio Engine
        if (playType !== 'mute') {
            scheduleClick(time, playType);
        }
    }

    // --- VISUAL SCHEDULING ---
    const visualDelay = (time - getAudioContext().currentTime) * 1000;
    setTimeout(() => {
        if (isMainBeatStart) {
            setCurrentBeat(currentMainBeat);
            setFlash(true);
            setTimeout(() => setFlash(false), 100);
        }
    }, Math.max(0, visualDelay));
  };

  const scheduler = () => {
    while (nextNoteTimeRef.current < getAudioContext().currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleNotes(beatCounterRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = window.setTimeout(scheduler, LOOKAHEAD);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      setIsPlaying(false);
      setCurrentBeat(1);
    } else {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      
      setMasterVolume(volume);

      beatCounterRef.current = 0;
      nextNoteTimeRef.current = ctx.currentTime + 0.05; 
      ghostBarRef.current = false;
      
      setIsPlaying(true);
      scheduler();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    };
  }, []);

  // --- Render Helpers ---
  const quickBpms = [50, 70, 90, 110, 130];
  
  // Render Beaters
  const renderVisualizer = () => {
      // Determine number of visual beats based on Time Signature
      let beats = 4;
      if (timeSig === '2/4') beats = 2;
      if (timeSig === '3/4') beats = 3;
      if (timeSig === '6/8') beats = 6; // Show all 6 clicks for 6/8
      if (timeSig === '4/4') beats = 4;

      return (
        <div className="flex justify-center gap-4 mb-8 h-8 items-center">
            {Array.from({ length: beats }).map((_, i) => {
                const beatNum = i + 1;
                // If switch happens mid-bar, currentBeat might temporarily exceed beats.
                // We modulo it just for safety in visual rendering.
                const safeCurrentBeat = ((currentBeat - 1) % beats) + 1;
                
                const isActive = safeCurrentBeat === beatNum && isPlaying;
                const isAccent = beatNum === 1;
                
                return (
                    <div 
                        key={i}
                        className={`
                            rounded-full transition-all duration-75
                            ${isActive 
                                ? (isAccent ? 'w-6 h-6 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'w-5 h-5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.6)]') 
                                : 'w-3 h-3 bg-slate-700'}
                        `}
                    />
                )
            })}
        </div>
      );
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 flex flex-col h-full max-w-lg mx-auto">
      
      {/* --- DISPLAY SECTION --- */}
      <div className="relative bg-slate-900 rounded-xl p-6 mb-6 border border-slate-700 text-center overflow-hidden">
        {/* Flash Overlay */}
        <div className={`absolute inset-0 bg-green-500/10 pointer-events-none transition-opacity duration-75 ${flash ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Ghost Mode Indicator */}
        {isGhostMode && isPlaying && ghostBarRef.current && (
            <div className="absolute top-2 right-2 text-slate-500 animate-pulse flex items-center gap-1 text-xs uppercase font-bold">
                <Ghost size={12} /> Ghost
            </div>
        )}

        <div className="text-6xl font-black text-white tracking-tighter mb-1 font-mono">
            {bpm}
        </div>
        <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Batidas Por Minuto</div>
      </div>

      {renderVisualizer()}

      {/* --- CONTROLS SECTION --- */}
      
      {/* Slider & Quick Jump */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setBpm(b => Math.max(30, b - 1))}
                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xl transition-colors"
            >-</button>
            <input 
                type="range" 
                min="30" 
                max="200" 
                value={bpm} 
                onChange={(e) => setBpm(Number(e.target.value))}
                className="flex-1 h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <button 
                onClick={() => setBpm(b => Math.min(200, b + 1))}
                className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xl transition-colors"
            >+</button>
        </div>

        <div className="flex justify-between gap-1">
            {quickBpms.map(val => (
                <button 
                    key={val}
                    onClick={() => setBpm(val)}
                    className="px-3 py-1 rounded bg-slate-900 text-xs font-mono text-slate-400 hover:text-green-400 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                    {val}
                </button>
            ))}
            <button 
                 onClick={() => setBpm(40)}
                 className="px-3 py-1 rounded bg-yellow-900/20 text-xs font-mono text-yellow-500 border border-yellow-500/30 hover:bg-yellow-900/40"
                 title="Modo Estudo Lento"
            >
                SLOW
            </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        
        {/* Time Signature */}
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <label className="text-[10px] uppercase text-slate-500 font-bold mb-2 block">Compasso</label>
            <div className="flex justify-between gap-1">
                {(['2/4', '3/4', '4/4', '6/8'] as TimeSignature[]).map(ts => (
                    <button
                        key={ts}
                        onClick={() => setTimeSig(ts)}
                        className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${timeSig === ts ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        {ts}
                    </button>
                ))}
            </div>
        </div>

        {/* Subdivision */}
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <label className="text-[10px] uppercase text-slate-500 font-bold mb-2 block">Subdivisão</label>
            <div className="flex justify-between gap-1">
                {(['1', '2', '3', '4'] as Subdivision[]).map(sub => (
                    <button
                        key={sub}
                        onClick={() => setSubdivision(sub)}
                        className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${subdivision === sub ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        {sub === '1' ? '1/4' : sub === '2' ? '1/8' : sub === '3' ? 'Tri' : '1/16'}
                    </button>
                ))}
            </div>
        </div>

        {/* Volume */}
        <div className="col-span-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
             <Volume2 size={16} className="text-slate-400" />
             <input 
                type="range" 
                min="0" 
                max="1.5" 
                step="0.1"
                value={volume} 
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
        </div>
      </div>

      {/* Advanced Modes */}
      <div className="mb-6 flex gap-2">
            <button 
                onClick={() => setIsGrooveMode(!isGrooveMode)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${isGrooveMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50' : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'}`}
                title="Acentua apenas tempos 2 e 4"
            >
                <Zap size={14} /> Groove (2&4)
            </button>
            <button 
                onClick={() => setIsGhostMode(!isGhostMode)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${isGhostMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/50' : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'}`}
                title="Silencia compassos aleatoriamente"
            >
                <Ghost size={14} /> Desafio
            </button>
      </div>

      {/* Main Action */}
      <button
          onClick={togglePlay}
          className={`
            mt-auto w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-xl transition-all shadow-xl
            ${isPlaying 
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 shadow-green-900/50 hover:scale-[1.02] active:scale-[0.98]'}
          `}
        >
          {isPlaying ? <><Square fill="currentColor" size={24} /> Parar</> : <><Play fill="currentColor" size={24} /> Iniciar</>}
        </button>
    </div>
  );
};