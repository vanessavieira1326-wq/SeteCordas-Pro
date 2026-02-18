import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Square, Repeat, FastForward, Rewind, Layers, Volume2, Info, Loader2, VolumeX, Plus, Minus, Sliders, Sparkles, Zap, Headphones, Target, ShieldBan } from 'lucide-react';
import { getAudioContext } from '../utils/audio';

// --- TYPES ---

interface ChannelNodes {
  gain: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  
  // Specific for 7-String Pro Isolation
  surdoNotch?: BiquadFilterNode; // To surgically remove Surdo boom
  presenceBoost?: BiquadFilterNode; // To highlight string attack
  
  reverbSend?: GainNode;
}

interface EqState {
  low: number; // -10 to 10
  mid: number;
  high: number;
}

export const AudioSeparator: React.FC = () => {
  // --- STATE ---
  const [file, setFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState<number>(0);
  const [loopEnd, setLoopEnd] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Volumes (0.0 - 2.0)
  const [volLow, setVolLow] = useState(1.0);
  const [volMid, setVolMid] = useState(1.0);
  const [volHigh, setVolHigh] = useState(1.0);

  // EQ States
  const [eqLowSettings, setEqLowSettings] = useState<EqState>({ low: 3, mid: 2, high: 0 }); 
  const [eqMidSettings, setEqMidSettings] = useState<EqState>({ low: 0, mid: 0, high: 0 });
  const [eqHighSettings, setEqHighSettings] = useState<EqState>({ low: 0, mid: 0, high: 0 });

  // Professional Tools State
  const [surdoCutFreq, setSurdoCutFreq] = useState(85); // Hz (Typical Surdo Boom)
  const [definitionAmount, setDefinitionAmount] = useState(5); // dB boost at 1.5kHz for attack
  const [isIsolationMode, setIsIsolationMode] = useState(true);

  // --- REFS ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // Audio Graph Nodes
  const nodesRef = useRef<{
    low: ChannelNodes | null;
    mid: ChannelNodes | null;
    high: ChannelNodes | null;
    compressor: DynamicsCompressorNode | null;
    bassCompressor: DynamicsCompressorNode | null;
    reverb: ConvolverNode | null;
  }>({ low: null, mid: null, high: null, compressor: null, bassCompressor: null, reverb: null });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformBufferRef = useRef<AudioBuffer | null>(null);

  // --- AUDIO ENGINE ---

  const createReverbImpulse = (ctx: AudioContext, duration: number = 2.0, decay: number = 2.0) => {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const n = i / length;
        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
    return impulse;
  };

  const setupAudioGraph = () => {
    if (!audioRef.current) return;
    
    const ctx = getAudioContext();
    audioContextRef.current = ctx;

    if (!sourceNodeRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
    }

    // --- DYNAMICS PROCESSING ---
    
    // Master Compressor (Glue)
    const masterCompressor = ctx.createDynamicsCompressor();
    masterCompressor.threshold.value = -10;
    masterCompressor.ratio.value = 4;
    masterCompressor.connect(ctx.destination);
    nodesRef.current.compressor = masterCompressor;

    // Bass Specific Compressor ("Transient Shaper" for 7 String)
    // We want slow attack to let the "pluck" through, fast release to kill the "boom"
    const bassCompressor = ctx.createDynamicsCompressor();
    bassCompressor.threshold.value = -20; 
    bassCompressor.knee.value = 5;
    bassCompressor.ratio.value = 6; 
    bassCompressor.attack.value = 0.03; // 30ms lets the pick attack through
    bassCompressor.release.value = 0.15; // Fast release controls the tail (surdo bloom)
    bassCompressor.connect(masterCompressor); 
    nodesRef.current.bassCompressor = bassCompressor;

    // Reverb Bus
    const reverbNode = ctx.createConvolver();
    reverbNode.buffer = createReverbImpulse(ctx, 1.5, 3.0);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.15;
    reverbNode.connect(reverbGain);
    reverbGain.connect(masterCompressor);
    nodesRef.current.reverb = reverbNode;

    // --- CROSSOVER DEFINITIONS (PRO TUNING) ---
    // 7-String Range: ~55Hz (A1) to ~600Hz (Upper neck logic). Attack is around 1.2kHz.
    // Vocal Fundamentals: Start around 200Hz (Female) or 100Hz (Male).
    // Surdo: Deep energy at 50-80Hz.
    
    // Strategy: 
    // Bass Channel gets < 300Hz (Body) AND a bandpass at 1.5kHz (Definition).
    // Mid Channel gets > 300Hz.
    
    const BASS_CROSSOVER = 280; // Slightly lower to minimize vocal bleed
    const TREBLE_CROSSOVER = 4000;

    const createFilters = (type: BiquadFilterType, freq: number, count: number) => {
        return Array(count).fill(0).map(() => {
            const f = ctx.createBiquadFilter();
            f.type = type;
            f.frequency.value = freq;
            return f;
        });
    };

    const chainFilters = (source: AudioNode, filters: BiquadFilterNode[], dest: AudioNode) => {
        let curr = source;
        filters.forEach(f => {
            curr.connect(f);
            curr = f;
        });
        curr.connect(dest);
    };

    // --- CHANNEL CREATION HELPER ---
    const createChannel = (initialVol: number, isBass: boolean = false): ChannelNodes => {
        // Gain
        const gain = ctx.createGain();
        gain.gain.value = initialVol;

        // 3-Band Standard EQ
        const eqLow = ctx.createBiquadFilter();
        eqLow.type = 'lowshelf';
        eqLow.frequency.value = 200;

        const eqMid = ctx.createBiquadFilter();
        eqMid.type = 'peaking';
        eqMid.frequency.value = 1000;
        eqMid.Q.value = 1.0;

        const eqHigh = ctx.createBiquadFilter();
        eqHigh.type = 'highshelf';
        eqHigh.frequency.value = 5000;

        // --- PRO BASS TOOLS ---
        let surdoNotch: BiquadFilterNode | undefined;
        let presenceBoost: BiquadFilterNode | undefined;
        let hpFilter: BiquadFilterNode | undefined;

        if (isBass) {
            // 1. High Pass (Safety Cut) - Remove absolute rumble/sub-bass that muddies the mix
            hpFilter = ctx.createBiquadFilter();
            hpFilter.type = 'highpass';
            hpFilter.frequency.value = 58; // Just below B1 (61Hz) / A1 (55Hz). Keeps musical notes, kills rumble.
            hpFilter.Q.value = 0.7;

            // 2. Surdo Notch (Surgical Cut) - User adjustable
            surdoNotch = ctx.createBiquadFilter();
            surdoNotch.type = 'notch';
            surdoNotch.frequency.value = surdoCutFreq; 
            surdoNotch.Q.value = 4.0; // Narrow cut to avoid killing the guitar note 'E' or 'A'

            // 3. Presence/Definition (Bring back the attack)
            presenceBoost = ctx.createBiquadFilter();
            presenceBoost.type = 'peaking';
            presenceBoost.frequency.value = 1400; // The "clack" of the string
            presenceBoost.Q.value = 1.5;
            presenceBoost.gain.value = definitionAmount;
        }

        const reverbSend = ctx.createGain();
        reverbSend.gain.value = 0;

        // Internal Chain Construction
        // Signal -> HP (Bass only) -> Surdo Notch (Bass only) -> EQ Low -> EQ Mid -> EQ High -> Presence (Bass only) -> Gain
        
        let chainHead: AudioNode = eqLow;
        
        // Connect Head
        if (isBass && hpFilter && surdoNotch) {
            hpFilter.connect(surdoNotch);
            surdoNotch.connect(eqLow);
            chainHead = hpFilter; // New Head
        }

        eqLow.connect(eqMid);
        eqMid.connect(eqHigh);
        
        let chainTail: AudioNode = eqHigh;

        if (isBass && presenceBoost) {
            eqHigh.connect(presenceBoost);
            chainTail = presenceBoost;
        }

        chainTail.connect(gain);
        
        // Output Routing
        if (isBass) {
            gain.connect(bassCompressor); 
        } else {
            gain.connect(masterCompressor); 
            gain.connect(reverbSend); 
            reverbSend.connect(reverbNode);
        }

        return { gain, eqLow, eqMid, eqHigh, reverbSend, surdoNotch, presenceBoost };
    };

    // Initialize Channels
    nodesRef.current.low = createChannel(volLow, true); 
    nodesRef.current.mid = createChannel(volMid, false);
    nodesRef.current.high = createChannel(volHigh, false);

    // --- CROSSOVER ROUTING ---

    // Path 1: VIOLÃO 7 CORDAS (Low + Attack)
    
    const lowPasses = createFilters('lowpass', BASS_CROSSOVER, 4); // 48dB/oct steep cut
    
    // Correct routing:
    // Source -> 4x LowPass -> Bass Channel
    // Explicitly casting bassInput to AudioNode to handle assignment of BiquadFilterNode
    let bassInput: AudioNode = sourceNodeRef.current!;
    lowPasses.forEach(f => { bassInput.connect(f); bassInput = f; });
    
    // Source -> LowPass Filters -> nodesRef.current.low.eqLow
    let curr: AudioNode = sourceNodeRef.current!;
    lowPasses.forEach(f => { curr.connect(f); curr = f; });
    if (nodesRef.current.low) curr.connect(nodesRef.current.low.eqLow);

    // Path 2: MID (Voice/Harmonia)
    const midHighPasses = createFilters('highpass', BASS_CROSSOVER, 4);
    const midLowPasses = createFilters('lowpass', TREBLE_CROSSOVER, 4);
    
    let midChain: AudioNode = sourceNodeRef.current!;
    midHighPasses.forEach(f => { midChain.connect(f); midChain = f; });
    midLowPasses.forEach(f => { midChain.connect(f); midChain = f; });
    if (nodesRef.current.mid) midChain.connect(nodesRef.current.mid.eqLow);

    // Path 3: HIGH (Percussion)
    const highPasses = createFilters('highpass', TREBLE_CROSSOVER, 4);
    let highChain: AudioNode = sourceNodeRef.current!;
    highPasses.forEach(f => { highChain.connect(f); highChain = f; });
    if (nodesRef.current.high) highChain.connect(nodesRef.current.high.eqLow);
  };

  // --- UPDATES ---

  // Handle Pro Tool Updates (Notch & Definition)
  useEffect(() => {
    const t = getAudioContext().currentTime;
    const lowNodes = nodesRef.current.low;
    if (lowNodes && lowNodes.surdoNotch && lowNodes.presenceBoost) {
        // Update Surdo Notch
        lowNodes.surdoNotch.frequency.setTargetAtTime(surdoCutFreq, t, 0.1);
        
        // Update Definition
        lowNodes.presenceBoost.gain.setTargetAtTime(definitionAmount, t, 0.1);
    }
  }, [surdoCutFreq, definitionAmount]);

  // Handle EQ
  useEffect(() => {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const ramp = 0.1;
    const applyEq = (nodes: ChannelNodes | null, settings: EqState) => {
        if (!nodes) return;
        nodes.eqLow.gain.setTargetAtTime(settings.low, t, ramp);
        nodes.eqMid.gain.setTargetAtTime(settings.mid, t, ramp);
        nodes.eqHigh.gain.setTargetAtTime(settings.high, t, ramp);
    };
    applyEq(nodesRef.current.low, eqLowSettings);
    applyEq(nodesRef.current.mid, eqMidSettings);
    applyEq(nodesRef.current.high, eqHighSettings);
  }, [eqLowSettings, eqMidSettings, eqHighSettings]);

  // Handle Volume (Precision Mute)
  useEffect(() => {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    
    const updateGain = (nodes: ChannelNodes | null, val: number) => {
        if (!nodes) return;
        nodes.gain.gain.cancelScheduledValues(t);
        if (val <= 0.01) nodes.gain.gain.setTargetAtTime(0, t, 0.01); // Hard Mute
        else nodes.gain.gain.setTargetAtTime(val, t, 0.05);
    };

    updateGain(nodesRef.current.low, volLow);
    updateGain(nodesRef.current.mid, volMid);
    updateGain(nodesRef.current.high, volHigh);
  }, [volLow, volMid, volHigh]);


  // --- STANDARD HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsLoading(true);
      setIsPlaying(false);

      // AUTO-SETUP FOR 7 STRING ISOLATION
      setVolLow(1.0);
      setVolMid(0); // Mute Voice
      setVolHigh(0); // Mute Percussion
      setSurdoCutFreq(85); // Default Surdo Hz
      setDefinitionAmount(6); // Boost Attack

      const objectUrl = URL.createObjectURL(selectedFile);
      if (audioRef.current) {
          audioRef.current.src = objectUrl;
          audioRef.current.load();
      }
      try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const ctx = getAudioContext();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          waveformBufferRef.current = audioBuffer;
          setDuration(audioBuffer.duration);
          setLoopEnd(audioBuffer.duration);
          drawWaveform();
      } catch (err) { console.error(err); } 
      finally { setIsLoading(false); }
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    if (!nodesRef.current.low) setupAudioGraph();

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.currentTime = isLooping ? loopStart : 0;
      setCurrentTime(audioRef.current.currentTime);
      setIsPlaying(false);
  };

  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.preservesPitch = true;
      }
  }, [playbackRate]);

  // Loop Check
  useEffect(() => {
    const loopCheck = () => {
        if (!audioRef.current) return;
        const curr = audioRef.current.currentTime;
        setCurrentTime(curr);
        if (isLooping && loopEnd > loopStart) {
            if (curr >= loopEnd || curr < loopStart) audioRef.current.currentTime = loopStart;
        }
        animationFrameRef.current = requestAnimationFrame(loopCheck);
    };
    if (isPlaying) animationFrameRef.current = requestAnimationFrame(loopCheck);
    else if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPlaying, isLooping, loopStart, loopEnd]);


  // --- VISUALS ---
  const drawWaveform = () => {
      if (!canvasRef.current || !waveformBufferRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      const data = waveformBufferRef.current.getChannelData(0);
      const step = Math.ceil(data.length / width);
      const amp = height / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.beginPath();
      ctx.moveTo(0, amp);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      for (let i = 0; i < width; i++) {
          let min = 1.0, max = -1.0;
          for (let j = 0; j < step; j++) {
              const datum = data[(i * step) + j];
              if (datum < min) min = datum;
              if (datum > max) max = datum;
          }
          ctx.lineTo(i, (1 + min) * amp);
          ctx.lineTo(i, (1 + max) * amp);
      }
      ctx.stroke();
  };
  
  // Overlay
  useEffect(() => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      drawWaveform(); 
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      if (duration > 0) {
          const xStart = (loopStart / duration) * width;
          const xEnd = (loopEnd / duration) * width;
          ctx.fillStyle = 'rgba(234, 179, 8, 0.15)'; // Yellow tint
          ctx.fillRect(xStart, 0, xEnd - xStart, height);
          ctx.strokeStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(xStart, 0); ctx.lineTo(xStart, height);
          ctx.moveTo(xEnd, 0); ctx.lineTo(xEnd, height);
          ctx.stroke();
      }
      if (duration > 0) {
          const xPos = (currentTime / duration) * width;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(xPos, 0); ctx.lineTo(xPos, height); ctx.stroke();
      }
  }, [currentTime, loopStart, loopEnd, duration]);

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!duration) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const perc = (e.clientX - rect.left) / rect.width;
      if (audioRef.current) {
          audioRef.current.currentTime = perc * duration;
          setCurrentTime(perc * duration);
      }
  };
  const setLoopPoint = (type: 'start' | 'end') => {
      if (type === 'start') setLoopStart(currentTime); else setLoopEnd(currentTime);
      setIsLooping(true);
  };
  const formatTime = (t: number) => {
      const min = Math.floor(t / 60);
      const sec = Math.floor(t % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // --- UI COMPONENTS ---
  
  const updateVolume = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, delta: number) => {
      const newVal = Math.max(0, Math.min(2, current + delta));
      setter(parseFloat(newVal.toFixed(1)));
  };

  const updateEQ = (
      setter: React.Dispatch<React.SetStateAction<EqState>>, 
      band: keyof EqState, 
      delta: number
  ) => {
      setter(prev => ({ ...prev, [band]: Math.max(-12, Math.min(12, prev[band] + delta)) }));
  };

  const renderChannelControls = (
      title: string, 
      sub: string, 
      color: string, 
      vol: number, 
      setVol: React.Dispatch<React.SetStateAction<number>>,
      eq: EqState,
      setEq: React.Dispatch<React.SetStateAction<EqState>>,
      icon: React.ReactNode,
      children?: React.ReactNode
  ) => {
      return (
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex flex-col gap-3 relative overflow-hidden group">
            {/* Header */}
            <div className={`flex items-center gap-2 border-b border-slate-700 pb-2 ${color}`}>
                {icon}
                <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider">{title}</div>
                    <div className="text-[9px] text-slate-500">{sub}</div>
                </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg relative">
                <button 
                    onClick={() => updateVolume(setVol, vol, -0.1)}
                    className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all text-slate-300 z-20"
                ><Minus size={14} /></button>
                
                <div className="flex flex-col items-center w-16">
                    <span className={`text-xl font-bold ${vol === 0 ? 'text-slate-600' : 'text-white'}`}>{(vol * 100).toFixed(0)}%</span>
                    <div className="w-full h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full ${color.replace('text-', 'bg-')}`} style={{ width: `${(vol/2)*100}%` }} />
                    </div>
                </div>

                <button 
                    onClick={() => updateVolume(setVol, vol, 0.1)}
                    className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all text-slate-300 z-20"
                ><Plus size={14} /></button>

                {/* Mute Overlay */}
                {vol === 0 && (
                   <button 
                       onClick={() => setVol(1.0)}
                       className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-red-500 font-bold tracking-widest text-xs z-10 backdrop-blur-sm rounded-lg border border-red-500/30"
                   >
                       MUTADO
                   </button>
                )}
            </div>

            {/* CUSTOM PRO TOOLS (Like Surdo Killer) */}
            {children}

            {/* 3-Band EQ */}
            <div className="space-y-2 mt-1">
                <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 mb-1 uppercase">
                    <Sliders size={10} /> Equalizador
                </div>
                {[
                    { label: 'HIGH', key: 'high', val: eq.high },
                    { label: 'MID', key: 'mid', val: eq.mid },
                    { label: 'LOW', key: 'low', val: eq.low }
                ].map((band) => (
                    <div key={band.label} className="flex items-center gap-2">
                        <span className="w-8 text-[9px] font-bold text-slate-400 text-right">{band.label}</span>
                        <button onClick={() => updateEQ(setEq, band.key as keyof EqState, -1)} className="text-slate-500 hover:text-slate-300"><Minus size={10} /></button>
                        
                        <div className="flex-1 h-3 bg-slate-900 rounded relative overflow-hidden flex items-center justify-center">
                            <div className="absolute w-[1px] h-full bg-slate-700 left-1/2" />
                            <div 
                                className={`h-full absolute transition-all ${band.val > 0 ? 'bg-green-500 left-1/2' : 'bg-red-500 right-1/2'}`}
                                style={{ width: `${Math.abs(band.val) * 8}%` }}
                            />
                            <span className="relative text-[8px] z-10 text-white font-mono drop-shadow-md">{band.val > 0 ? `+${band.val}` : band.val}dB</span>
                        </div>

                        <button onClick={() => updateEQ(setEq, band.key as keyof EqState, 1)} className="text-slate-500 hover:text-slate-300"><Plus size={10} /></button>
                    </div>
                ))}
            </div>
            
            {vol > 0 && (
                <button onClick={() => setVol(0)} className="w-full py-1 text-[10px] font-bold text-red-400 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 rounded uppercase tracking-wider transition-colors mt-2">
                    Mutar Canal
                </button>
            )}
        </div>
      );
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-full flex flex-col">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} crossOrigin="anonymous" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="text-yellow-500" />
                Studio Pro 7 Cordas
            </h2>
            <p className="text-xs text-slate-400">Ferramenta profissional de isolamento e equalização de baixarias.</p>
          </div>

          <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-slate-600 shadow-lg">
             {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
             <span className="text-sm font-bold">Carregar Áudio</span>
             <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </label>
      </div>

      {!file ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/30 text-slate-500 gap-4">
              <Upload size={48} className="opacity-50" />
              <p>Carregue um Samba ou Choro para isolar o 7 cordas</p>
          </div>
      ) : (
          <div className="flex-1 flex flex-col gap-4">
              
              {/* WAVEFORM & TRANSPORT */}
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 shadow-inner">
                  <div className="relative h-24 w-full bg-slate-950 rounded-lg overflow-hidden cursor-crosshair mb-3 border border-slate-800">
                      <canvas ref={canvasRef} width={800} height={96} className="w-full h-full" onClick={handleSeek} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                          <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                              {isPlaying ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" size={18} className="ml-0.5" />}
                          </button>
                          <button onClick={stopAudio} className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center shadow">
                              <Square size={16} fill="currentColor" />
                          </button>
                          <div className="text-xs font-mono text-yellow-500 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 ml-2">
                              {formatTime(currentTime)} / {formatTime(duration)}
                          </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                          <button onClick={() => setLoopPoint('start')} className="px-2 py-1 text-[10px] font-bold hover:bg-slate-700 rounded text-yellow-200">IN (A)</button>
                          <button onClick={() => setLoopPoint('end')} className="px-2 py-1 text-[10px] font-bold hover:bg-slate-700 rounded text-yellow-200">OUT (B)</button>
                          <button onClick={() => setIsLooping(!isLooping)} className={`p-1 rounded transition-colors ${isLooping ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-500'}`}>
                              <Repeat size={14} />
                          </button>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                          <Rewind size={14} className="text-slate-500 cursor-pointer" onClick={() => setPlaybackRate(Math.max(0.5, playbackRate - 0.1))} />
                          <span className="text-xs font-mono w-10 text-center font-bold text-slate-300">{playbackRate.toFixed(2)}x</span>
                          <FastForward size={14} className="text-slate-500 cursor-pointer" onClick={() => setPlaybackRate(Math.min(1.5, playbackRate + 0.1))} />
                      </div>
                  </div>
              </div>

              {/* MIXING CONSOLE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                   
                   {/* 7 STRING CHANNEL (FEATURED) */}
                   {renderChannelControls(
                       "VIOLÃO 7 CORDAS", "Isolamento de Precisão", "text-yellow-500", 
                       volLow, setVolLow, eqLowSettings, setEqLowSettings,
                       <Target size={16} className="text-yellow-500" />,
                       <div className="bg-slate-900/80 p-2 rounded-lg border border-yellow-500/20 space-y-2 mb-2">
                           <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
                               <div className="flex items-center gap-1"><ShieldBan size={10} /> Corte Surdo</div>
                               <span className="text-yellow-500">{surdoCutFreq} Hz</span>
                           </div>
                           <input 
                               type="range" min="50" max="150" step="5"
                               value={surdoCutFreq}
                               onChange={(e) => setSurdoCutFreq(Number(e.target.value))}
                               className="w-full h-1 bg-slate-700 rounded appearance-none accent-red-500"
                               title="Ajuste para cortar o 'boom' do surdo"
                           />
                           
                           <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase mt-2">
                               <div className="flex items-center gap-1"><Zap size={10} /> Definição (Ataque)</div>
                               <span className="text-yellow-500">+{definitionAmount}dB</span>
                           </div>
                           <input 
                               type="range" min="0" max="15" step="1"
                               value={definitionAmount}
                               onChange={(e) => setDefinitionAmount(Number(e.target.value))}
                               className="w-full h-1 bg-slate-700 rounded appearance-none accent-green-500"
                               title="Aumenta o som da unhada/dedeira"
                           />
                       </div>
                   )}

                   {/* MID CHANNEL */}
                   {renderChannelControls(
                       "VOZ / HARMONIA", "Frequências Médias", "text-indigo-500", 
                       volMid, setVolMid, eqMidSettings, setEqMidSettings,
                       <Sparkles size={16} className="text-indigo-500" />
                   )}

                   {/* TREBLE CHANNEL */}
                   {renderChannelControls(
                       "PERCUSSÃO / AGUDOS", "Brilho & Ataque", "text-pink-500", 
                       volHigh, setVolHigh, eqHighSettings, setEqHighSettings,
                       <Volume2 size={16} className="text-pink-500" />
                   )}
              </div>
          </div>
      )}
    </div>
  );
};