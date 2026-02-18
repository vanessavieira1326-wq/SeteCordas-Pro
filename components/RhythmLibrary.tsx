import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Music2, Sliders, Volume2, Rewind, FastForward } from 'lucide-react';
import { RhythmStyle } from '../types';
import { getAudioContext } from '../utils/audio';

// --- TYPES & PATTERNS ---

interface TrackPattern {
  steps: number[]; // 1 = trigger, 0 = silent, 0.5 = soft
  soundType: 'kick' | 'snare' | 'shaker' | 'rim' | 'agogo' | 'bass' | 'chord';
}

interface RhythmDefinition {
  id: RhythmStyle;
  description: string;
  defaultBpm: number;
  timeSignature: number; // 4 for 4/4, 2 for 2/4
  tracks: {
    percussion: TrackPattern[];
    bass: TrackPattern;
    harmony: TrackPattern;
  };
}

// 16-step grid (1 bar of 16th notes)
const RHYTHMS: RhythmDefinition[] = [
  {
    id: RhythmStyle.SAMBA,
    description: 'O ritmo nacional. Ênfase no tempo 2 (Surdo).',
    defaultBpm: 95,
    timeSignature: 2,
    tracks: {
      percussion: [
        { steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], soundType: 'kick' }, // Surdo (Beat 2)
        { steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], soundType: 'shaker' }, // Ganza
        { steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], soundType: 'rim' } // Tamborim pattern
      ],
      bass: { steps: [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0], soundType: 'bass' }, // "Tum... tum-TUM..."
      harmony: { steps: [0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0], soundType: 'chord' } // Syncopated
    }
  },
  {
    id: RhythmStyle.CHORO,
    description: 'Rápido e técnico. Pandeiro em semicocheias.',
    defaultBpm: 80,
    timeSignature: 2,
    tracks: {
      percussion: [
        { steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], soundType: 'kick' }, // Marcacao leve
        { steps: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5], soundType: 'rim' } // Pandeiro fill
      ],
      bass: { steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], soundType: 'bass' }, // Baixaria changes often
      harmony: { steps: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], soundType: 'chord' } 
    }
  },
  {
    id: RhythmStyle.BOSSA_NOVA,
    description: 'Suave, sincopado. Clave característica no violão.',
    defaultBpm: 120,
    timeSignature: 4,
    tracks: {
      percussion: [
        { steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], soundType: 'kick' },
        { steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], soundType: 'shaker' } // Hi-hat brush
      ],
      bass: { steps: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], soundType: 'bass' },
      harmony: { steps: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], soundType: 'chord' } // Clave
    }
  },
  {
    id: RhythmStyle.PARTIDO_ALTO,
    description: 'Samba de roda com alta síncopa e percussão forte.',
    defaultBpm: 90,
    timeSignature: 2,
    tracks: {
      percussion: [
        { steps: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], soundType: 'agogo' }, // Clave de partido
        { steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], soundType: 'kick' }
      ],
      bass: { steps: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], soundType: 'bass' },
      harmony: { steps: [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0], soundType: 'chord' }
    }
  },
  {
    id: RhythmStyle.MAXIXE,
    description: 'O "Tango Brasileiro". Ritmo quebrado e dançante.',
    defaultBpm: 75,
    timeSignature: 2,
    tracks: {
      percussion: [
        { steps: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0], soundType: 'snare' }, // Habanera feel
      ],
      bass: { steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], soundType: 'bass' }, // Staccato
      harmony: { steps: [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0], soundType: 'chord' }
    }
  },
  {
    id: RhythmStyle.SAMBA_CANCAO,
    description: 'Lento, dramático e sentimental.',
    defaultBpm: 60,
    timeSignature: 2,
    tracks: {
      percussion: [
         { steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], soundType: 'kick' },
         { steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], soundType: 'shaker' }
      ],
      bass: { steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], soundType: 'bass' },
      harmony: { steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], soundType: 'chord' } // Sustained
    }
  }
];

// --- AUDIO ENGINE ---

const playSound = (ctx: AudioContext, dest: GainNode, type: string, time: number, gainVal: number) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    // Connect
    osc.connect(env);
    env.connect(dest);

    // Synthesis Logic
    if (type === 'kick') {
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
        env.gain.setValueAtTime(gainVal * 1.0, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.3);
    } 
    else if (type === 'shaker') {
        // Use filtered noise ideally, simulating with high tri for simplicity without noise buffer util
        osc.type = 'sawtooth'; // Rougher
        osc.frequency.setValueAtTime(8000, time);
        env.gain.setValueAtTime(gainVal * 0.1, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.start(time);
        osc.stop(time + 0.05);
    }
    else if (type === 'rim' || type === 'snare') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, time);
        env.gain.setValueAtTime(gainVal * 0.3, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        osc.start(time);
        osc.stop(time + 0.08);
    }
    else if (type === 'agogo') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, time);
        env.gain.setValueAtTime(gainVal * 0.4, time);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
    }
    else if (type === 'bass') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(82.4, time); // E2
        env.gain.setValueAtTime(gainVal * 0.8, time);
        env.gain.linearRampToValueAtTime(gainVal * 0.5, time + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        osc.start(time);
        osc.stop(time + 0.4);
    }
    else if (type === 'chord') {
        // Simulate a strummed chord (Root-5-10)
        const freqs = [261.6, 329.6, 392.0]; // C Major
        const now = time;
        freqs.forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = f;
            o.type = 'triangle';
            o.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(gainVal * 0.1, now + 0.02 + (i*0.01)); // Strum
            g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
            o.start(now);
            o.stop(now + 1.0);
        });
    }
};

export const RhythmLibrary: React.FC = () => {
  const [activeRhythm, setActiveRhythm] = useState<RhythmDefinition>(RHYTHMS[0]);
  const [bpm, setBpm] = useState(RHYTHMS[0].defaultBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Volumes (0 to 1)
  const [volHarmony, setVolHarmony] = useState(0.5);
  const [volPercussion, setVolPercussion] = useState(0.7);
  const [volBass, setVolBass] = useState(0.8);

  // Audio Refs
  const schedulerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  
  // Mixer Nodes
  const mixerRef = useRef<{
      master: GainNode | null;
      harmony: GainNode | null;
      percussion: GainNode | null;
      bass: GainNode | null;
  }>({ master: null, harmony: null, percussion: null, bass: null });

  // Init Audio
  useEffect(() => {
    const ctx = getAudioContext();
    if (!mixerRef.current.master) {
        mixerRef.current.master = ctx.createGain();
        mixerRef.current.master.connect(ctx.destination);
        
        mixerRef.current.harmony = ctx.createGain();
        mixerRef.current.harmony.connect(mixerRef.current.master);
        
        mixerRef.current.percussion = ctx.createGain();
        mixerRef.current.percussion.connect(mixerRef.current.master);
        
        mixerRef.current.bass = ctx.createGain();
        mixerRef.current.bass.connect(mixerRef.current.master);
    }
  }, []);

  // Update Volumes
  useEffect(() => {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    if (mixerRef.current.harmony) mixerRef.current.harmony.gain.setTargetAtTime(volHarmony, t, 0.1);
    if (mixerRef.current.percussion) mixerRef.current.percussion.gain.setTargetAtTime(volPercussion, t, 0.1);
    if (mixerRef.current.bass) mixerRef.current.bass.gain.setTargetAtTime(volBass, t, 0.1);
  }, [volHarmony, volPercussion, volBass]);

  // Scheduler Engine
  const schedule = () => {
    const ctx = getAudioContext();
    const lookahead = 25.0; // ms
    const scheduleAheadTime = 0.1; // s

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        // Play Sounds for current step
        const step = currentStepRef.current % 16;
        const time = nextNoteTimeRef.current;

        // Visual update (decoupled slightly)
        // Using a ref or timeout to sync visual to audio
        const visualDelay = (time - ctx.currentTime) * 1000;
        setTimeout(() => setCurrentStep(step), Math.max(0, visualDelay));

        // Trigger Tracks
        // 1. Percussion
        activeRhythm.tracks.percussion.forEach(track => {
            const val = track.steps[step];
            if (val > 0) {
                playSound(ctx, mixerRef.current.percussion!, track.soundType, time, val);
            }
        });

        // 2. Bass
        const bassVal = activeRhythm.tracks.bass.steps[step];
        if (bassVal > 0) {
            playSound(ctx, mixerRef.current.bass!, activeRhythm.tracks.bass.soundType, time, bassVal);
        }

        // 3. Harmony
        const harmVal = activeRhythm.tracks.harmony.steps[step];
        if (harmVal > 0) {
            playSound(ctx, mixerRef.current.harmony!, activeRhythm.tracks.harmony.soundType, time, harmVal);
        }

        // Advance
        const secondsPerStep = (60.0 / bpm) / 4; // 16th notes
        nextNoteTimeRef.current += secondsPerStep;
        currentStepRef.current++;
    }

    schedulerRef.current = window.setTimeout(schedule, lookahead);
  };

  const togglePlay = () => {
      if (isPlaying) {
          if (schedulerRef.current) clearTimeout(schedulerRef.current);
          setIsPlaying(false);
          setCurrentStep(0);
      } else {
          const ctx = getAudioContext();
          if (ctx.state === 'suspended') ctx.resume();
          
          nextNoteTimeRef.current = ctx.currentTime + 0.05;
          currentStepRef.current = 0;
          setIsPlaying(true);
          schedule();
      }
  };

  const selectRhythm = (r: RhythmDefinition) => {
      if (isPlaying) togglePlay();
      setActiveRhythm(r);
      setBpm(r.defaultBpm);
  };

  useEffect(() => {
      return () => {
          if (schedulerRef.current) clearTimeout(schedulerRef.current);
      };
  }, []);

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-full flex flex-col md:flex-row gap-6">
       
       {/* Sidebar: List */}
       <div className="w-full md:w-1/3 flex flex-col border-r border-slate-700/50 pr-0 md:pr-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center text-slate-900 font-bold">
                    <Music2 size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Biblioteca</h2>
                    <p className="text-xs text-slate-400">Playbacks brasileiros</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {RHYTHMS.map(r => (
                    <button
                        key={r.id}
                        onClick={() => selectRhythm(r)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${activeRhythm.id === r.id ? 'bg-pink-500/10 border-pink-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <div className="font-bold text-sm">{r.id}</div>
                        <div className="text-[10px] opacity-70">{r.defaultBpm} BPM • {r.description}</div>
                    </button>
                ))}
            </div>
       </div>

       {/* Main Area: Mixer & Player */}
       <div className="flex-1 flex flex-col">
            {/* Header / Transport */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 mb-6 relative overflow-hidden">
                {/* Visualizer Background */}
                <div className="absolute top-0 left-0 h-1 w-full flex">
                     {Array.from({length: 16}).map((_, i) => (
                         <div 
                            key={i} 
                            className={`flex-1 transition-colors duration-75 ${currentStep % 16 === i && isPlaying ? 'bg-pink-500' : 'bg-slate-800'}`} 
                         />
                     ))}
                </div>

                <div className="flex justify-between items-start mb-6 mt-2">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{activeRhythm.id}</h3>
                        <div className="flex items-center gap-2 text-pink-400 text-sm font-bold bg-pink-900/20 px-2 py-1 rounded inline-block">
                             <span>Compasso: {activeRhythm.timeSignature}/4</span>
                             <span>•</span>
                             <span>16 Steps Loop</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-mono font-bold text-slate-200">{bpm}</div>
                        <div className="text-[10px] uppercase text-slate-500">BPM</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <button 
                        onClick={togglePlay}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${isPlaying ? 'bg-red-500 text-white' : 'bg-green-500 text-slate-900'}`}
                     >
                        {isPlaying ? <Square size={24} fill="currentColor"/> : <Play size={28} fill="currentColor" className="ml-1"/>}
                     </button>
                     
                     <div className="flex-1 bg-slate-800 rounded-lg p-3 flex items-center gap-3 border border-slate-700">
                        <Rewind size={20} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => setBpm(b => b - 5)}/>
                        <input 
                            type="range" min="40" max="160" value={bpm} 
                            onChange={(e) => setBpm(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none accent-pink-500"
                        />
                        <FastForward size={20} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => setBpm(b => b + 5)}/>
                     </div>
                </div>
            </div>

            {/* Mixer */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700 flex-1">
                 <div className="flex items-center gap-2 mb-4 text-slate-400">
                     <Sliders size={18} />
                     <span className="text-xs font-bold uppercase tracking-widest">Mixer de Canais</span>
                 </div>

                 <div className="space-y-6">
                     {/* Harmony Channel */}
                     <div className="flex items-center gap-4">
                         <div className="w-24 text-right text-xs font-bold text-indigo-300">HARMONIA</div>
                         <Volume2 size={16} className={volHarmony === 0 ? 'text-slate-600' : 'text-indigo-500'} />
                         <input 
                            type="range" min="0" max="1" step="0.05"
                            value={volHarmony}
                            onChange={(e) => setVolHarmony(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none accent-indigo-500"
                         />
                         <div className="w-8 text-xs text-slate-500 font-mono">{(volHarmony * 100).toFixed(0)}%</div>
                     </div>

                     {/* Percussion Channel */}
                     <div className="flex items-center gap-4">
                         <div className="w-24 text-right text-xs font-bold text-pink-300">PERCUSSÃO</div>
                         <Volume2 size={16} className={volPercussion === 0 ? 'text-slate-600' : 'text-pink-500'} />
                         <input 
                            type="range" min="0" max="1" step="0.05"
                            value={volPercussion}
                            onChange={(e) => setVolPercussion(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none accent-pink-500"
                         />
                         <div className="w-8 text-xs text-slate-500 font-mono">{(volPercussion * 100).toFixed(0)}%</div>
                     </div>

                     {/* Bass Channel */}
                     <div className="flex items-center gap-4">
                         <div className="w-24 text-right text-xs font-bold text-yellow-300">BAIXO</div>
                         <Volume2 size={16} className={volBass === 0 ? 'text-slate-600' : 'text-yellow-500'} />
                         <input 
                            type="range" min="0" max="1" step="0.05"
                            value={volBass}
                            onChange={(e) => setVolBass(Number(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none accent-yellow-500"
                         />
                         <div className="w-8 text-xs text-slate-500 font-mono">{(volBass * 100).toFixed(0)}%</div>
                     </div>
                 </div>

                 <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500">
                    <div>
                        <span className="block font-bold text-slate-400">Dica de Estudo:</span>
                        Zere a Harmonia para treinar o acompanhamento, ou zere o Baixo para criar suas baixarias.
                    </div>
                    <div className="flex gap-1">
                        {Array.from({length: 4}).map((_, i) => (
                             <div key={i} className={`w-2 h-2 rounded-full ${Math.floor(currentStep / 4) === i && isPlaying ? 'bg-pink-500' : 'bg-slate-700'}`} />
                        ))}
                    </div>
                 </div>
            </div>
       </div>
    </div>
  );
};