
import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Music, Plus, Save, Trash2, Settings2, RefreshCw, Layers, Download, Wand2, Speaker, FileAudio, FileText, Loader2 } from 'lucide-react';
import { RhythmStyle, SeventhStringTuning, BassLick, Chord, BassNote, NoteName, InstrumentType, NoteDensity, Tonality } from '../types';
import { generateProgression, generateBassLine } from '../services/baixariaGenerator';
import { playInstrumentNote, scheduleClick, getAudioContext } from '../utils/audio';
import { getFrequency, NOTES } from '../utils/musicTheory';
import { jsPDF } from "jspdf";

export const BassTrainer: React.FC = () => {
    // --- State ---
    const [style, setStyle] = useState<RhythmStyle>(RhythmStyle.SAMBA);
    const [tuning, setTuning] = useState<SeventhStringTuning>(SeventhStringTuning.C);
    const [level, setLevel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Intermediário');
    const [key, setKey] = useState<NoteName>('C');
    const [tonality, setTonality] = useState<Tonality>('Minor'); // Default to Minor for scale study
    const [tempo, setTempo] = useState(90);
    const [instrument, setInstrument] = useState<InstrumentType>('nylon');
    const [density, setDensity] = useState<NoteDensity | 'scale'>('auto');

    // Display State
    const [progression, setProgression] = useState<Chord[]>([]);
    const [bassLine, setBassLine] = useState<BassNote[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

    // --- LIVE AUDIO REFS (For seamless updates without stopping) ---
    const progressionRef = useRef<Chord[]>([]);
    const bassLineRef = useRef<BassNote[]>([]);
    const tempoRef = useRef(tempo);
    const instrumentRef = useRef(instrument);
    
    // Scheduler Refs
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const beatRef = useRef<number>(0);

    // Sync Refs with State
    useEffect(() => { tempoRef.current = tempo; }, [tempo]);
    useEffect(() => { instrumentRef.current = instrument; }, [instrument]);

    // --- GENERATOR (HOT SWAP) ---
    // This effect runs whenever parameters change, updating the music data on the fly
    useEffect(() => {
        const newProg = generateProgression(key, tonality, level);
        const newBass = generateBassLine(newProg, style, level, tuning, key, density);
        
        // Update State (Visuals)
        setProgression(newProg);
        setBassLine(newBass);
        
        // Update Refs (Audio Engine - Live)
        progressionRef.current = newProg;
        bassLineRef.current = newBass;
        
        // If not playing, reset beat visual
        if (!isPlaying) {
            setCurrentBeat(0);
        }
    }, [key, tonality, level, style, tuning, density]); // Dependencies trigger regeneration

    // Force regeneration button (for same parameters, new variation)
    const handleForceGenerate = () => {
        const newProg = generateProgression(key, tonality, level);
        const newBass = generateBassLine(newProg, style, level, tuning, key, density);
        setProgression(newProg);
        setBassLine(newBass);
        progressionRef.current = newProg;
        bassLineRef.current = newBass;
    };

    // --- SEQUENCER / PLAYBACK ---
    const play = () => {
        if (isPlaying) {
            stop();
            return;
        }

        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        
        setIsPlaying(true);
        beatRef.current = 0;
        startTimeRef.current = ctx.currentTime; // Reset start time
        
        scheduleNext();
    };

    const stop = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsPlaying(false);
        setCurrentBeat(0);
    };

    const scheduleNext = () => {
        const ctx = getAudioContext();
        // Use Refs for Tempo and Data to allow changing while playing
        const currentTempo = tempoRef.current;
        const currentBassLine = bassLineRef.current;
        const currentProgression = progressionRef.current;
        const currentInstrument = instrumentRef.current;

        const secondsPerBeat = 60.0 / currentTempo;
        const lookahead = 0.1; // 100ms
        
        // Calculate current time in song
        // We use a modulo based on total duration to handle looping correctly even if length changes
        const playTime = ctx.currentTime - startTimeRef.current;
        
        // Total Duration in beats
        const totalDuration = currentProgression.reduce((acc, c) => acc + c.duration, 0);
        if (totalDuration === 0) return; // Safety

        // Current Beat Position
        const currentSeqBeat = playTime / secondsPerBeat;
        
        setCurrentBeat(currentSeqBeat);

        // Schedule Notes
        currentBassLine.forEach(note => {
            // Check if note is in the window relative to the loop
            // Handle Looping Logic for the Note Schedule:
            // We check if the note time is close to (currentSeqBeat % totalDuration)
            
            // However, simple linear check is safer for short loops:
            // Calculate absolute time of note in this specific loop iteration
            // We might need to handle the wrap around visually, but for audio:
            
            // Simplification: Just check note.startTime vs currentSeqBeat relative to this loop
            // NOTE: If user changes progression length mid-loop, visual might jump, but audio ref is updated.
            
            // To support infinite play with changing lengths, we rely on the loop reset logic below
            const noteTime = note.startTime * secondsPerBeat;
            const diff = noteTime - playTime;

            if (diff >= 0 && diff < lookahead) {
                const freq = getFrequency(note.note, note.octave);
                const humanize = Math.random() * 0.02;
                const dur = note.duration * secondsPerBeat;

                setTimeout(() => {
                    playInstrumentNote(freq, currentInstrument, dur);
                }, (diff + humanize) * 1000);
            }
        });

        // Loop Logic
        if (currentSeqBeat >= totalDuration) {
             startTimeRef.current = ctx.currentTime; // Reset loop time anchor
        }

        timerRef.current = window.setTimeout(scheduleNext, 50); // 20Hz refresh
    };

    useEffect(() => {
        return () => stop();
    }, []);

    // --- EXPORT FUNCTIONS ---

    // 1. WAV EXPORT (Audio)
    const exportAudio = async () => {
        setIsExporting(true);
        const ctx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
            1, // Mono
            44100 * (progression.reduce((acc, c) => acc + c.duration, 0) * (60 / tempo) + 2), // Duration + tail
            44100
        );

        const secondsPerBeat = 60.0 / tempo;

        bassLine.forEach(note => {
            const time = note.startTime * secondsPerBeat;
            const duration = note.duration * secondsPerBeat;
            const freq = getFrequency(note.note, note.octave);

            // Simple Synth for Export (Similar to utility but offline)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            // Tone Shaping based on Instrument Selection
            if (instrument === 'bass') {
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
            } else if (instrument === 'trombone') {
                osc.type = 'sawtooth';
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(200, time);
                filter.frequency.linearRampToValueAtTime(freq * 3, time + 0.1);
                osc.connect(filter);
                filter.connect(gain);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.6, time + 0.1);
                gain.gain.setValueAtTime(0.6, time + duration - 0.1);
                gain.gain.linearRampToValueAtTime(0, time + duration);
            } else {
                // Nylon default
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.5, time + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 1.5);
            }

            if (instrument !== 'trombone') osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = freq;
            osc.start(time);
            osc.stop(time + duration + 0.5);
        });

        const renderedBuffer = await ctx.startRendering();
        
        // Convert to WAV
        const wavBlob = audioBufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baixaria_${style.toLowerCase()}_${key}.wav`;
        a.click();
        
        setIsExporting(false);
    };

    // Helper: Buffer to WAV
    const audioBufferToWav = (buffer: AudioBuffer) => {
        const length = buffer.length * 2; // 16-bit
        const view = new DataView(new ArrayBuffer(44 + length));
        
        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
        };

        // RIFF chunk
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');
        // fmt chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, 44100, true);
        view.setUint32(28, 44100 * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        // data chunk
        writeString(view, 36, 'data');
        view.setUint32(40, length, true);

        // PCM Data
        const data = buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            const s = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([view], { type: 'audio/wav' });
    };

    // 2. PDF EXPORT (Sheet Music / Tab)
    const exportPDF = () => {
        setIsExporting(true);
        const doc = new jsPDF();
        
        // Styling
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, 210, 297, 'F'); // Dark Background
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(`Baixaria - ${style}`, 20, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(234, 179, 8); // Yellow
        doc.text(`Tom: ${key} ${tonality === 'Minor' ? 'Menor' : 'Maior'} | Nível: ${level} | 7ª Corda: ${tuning.split('(')[0]}`, 20, 30);
        
        // Draw Grid
        let startY = 50;
        const stringGap = 5;
        const beatWidth = 15;
        const totalBeats = progression.reduce((acc, c) => acc + c.duration, 0);
        
        // Render systems (bars)
        const beatsPerSystem = 8;
        const systems = Math.ceil(totalBeats / beatsPerSystem);
        
        for (let s = 0; s < systems; s++) {
            const systemBeatsStart = s * beatsPerSystem;
            const systemBeatsEnd = Math.min((s + 1) * beatsPerSystem, totalBeats);
            const startX = 20;

            // Draw Strings
            doc.setDrawColor(100, 116, 139); // Slate 500
            for (let str = 0; str < 7; str++) {
                const y = startY + (str * stringGap);
                doc.line(startX, y, 190, y);
                // String Label
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                const label = ['E','B','G','D','A','E','7'][str];
                doc.text(label, startX - 5, y + 1);
            }

            // Draw Barlines
            for (let b = 0; b <= (systemBeatsEnd - systemBeatsStart); b+=2) { // Every 2 beats roughly
                 const x = startX + (b * beatWidth);
                 doc.line(x, startY, x, startY + (6 * stringGap));
            }

            // Draw Chords & Notes
            const notesInSystem = bassLine.filter(n => 
                n.startTime >= systemBeatsStart && n.startTime < systemBeatsEnd
            );
            
            let beatCursor = 0;
            progression.forEach(chord => {
                const chordStart = beatCursor;
                const chordEnd = beatCursor + chord.duration;
                
                // If overlap with system
                if (chordEnd > systemBeatsStart && chordStart < systemBeatsEnd) {
                    const relativeStart = Math.max(0, chordStart - systemBeatsStart);
                    const x = startX + (relativeStart * beatWidth);
                    doc.setFontSize(14);
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.text(chord.display, x + 2, startY - 5);
                    doc.setFontSize(8);
                    doc.setTextColor(234, 179, 8);
                    doc.text(chord.quality, x + 2, startY - 2);
                }
                beatCursor += chord.duration;
            });

            // Draw Notes
            doc.setFont("courier", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255); // White numbers

            notesInSystem.forEach(note => {
                const relBeat = note.startTime - systemBeatsStart;
                const x = startX + (relBeat * beatWidth);
                const y = startY + ((note.string - 1) * stringGap) + 1; // +1 to center vertically

                // Draw background circle for legibility
                doc.setFillColor(15, 23, 42);
                doc.circle(x + 1, y - 1, 2, 'F');
                doc.text(note.fret.toString(), x, y);
            });

            startY += 50; // Move down for next system
        }

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Gerado por SeteCordas Pro", 100, 290, { align: "center" });

        doc.save(`baixaria_${style}.pdf`);
        setIsExporting(false);
    };


    // --- RENDERERS ---

    const renderTimeline = () => {
        if (progression.length === 0) return null;

        const totalBeats = progression.reduce((sum, c) => sum + c.duration, 0);
        const beatWidth = 60; // px per beat
        const stringSpacing = 24; // px between strings
        const tabTopPadding = 30;

        return (
            <div className="relative bg-[#fafafa] rounded-xl border-4 border-slate-800 overflow-x-auto overflow-y-hidden mb-6 select-none shadow-2xl">
                 <div className="relative" style={{ width: `${Math.max(totalBeats * beatWidth, 600)}px`, minHeight: '300px' }}>
                     
                     {/* 1. PROGRESSION HEADER (CHORDS) */}
                     <div className="h-20 flex bg-white border-b-2 border-slate-800">
                         {progression.map((chord, i) => (
                             <div 
                                key={i} 
                                className="border-r border-slate-200 flex flex-col items-center justify-center relative"
                                style={{ width: chord.duration * beatWidth }}
                             >
                                 <span className="text-xl font-black text-slate-900">{chord.display}</span>
                                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest absolute bottom-2">{chord.quality}</span>
                             </div>
                         ))}
                     </div>

                     {/* 2. TIMELINE GRID & CURSOR */}
                     <div className="absolute top-20 bottom-0 left-0 right-0 pointer-events-none z-0">
                         {Array.from({ length: totalBeats + 1 }).map((_, i) => (
                             <div key={i} className="absolute top-0 bottom-0 border-r border-slate-300/50" style={{ left: i * beatWidth }}>
                                 <span className="text-[9px] text-slate-400 pl-1 pt-1 font-mono">{i + 1}</span>
                             </div>
                         ))}
                     </div>

                     {isPlaying && (
                         <div 
                            className="absolute top-20 bottom-0 w-0.5 bg-red-600 z-50 shadow-[0_0_8px_rgba(220,38,38,0.5)] transition-all duration-75 ease-linear"
                            style={{ left: `${(currentBeat % totalBeats) * beatWidth}px` }}
                         />
                     )}

                     {/* 3. TABLATURE AREA */}
                     <div className="relative pt-4 pl-0 pb-4">
                         
                         {/* String Labels (Left) */}
                         <div className="absolute left-1 top-[42px] flex flex-col gap-[3px] pointer-events-none opacity-30 select-none">
                             {['E','B','G','D','A','E','7'].map((s, i) => (
                                 <span key={i} className="text-[9px] font-bold text-slate-900 h-[24px] flex items-center justify-center w-4">{s}</span>
                             ))}
                         </div>

                         {/* String Lines */}
                         {Array.from({ length: 7 }).map((_, i) => (
                             <div 
                                key={i} 
                                className="absolute w-full border-t border-slate-400 z-0" 
                                style={{ top: tabTopPadding + (i * stringSpacing) }} 
                             />
                         ))}

                         {/* Notes */}
                         {bassLine.map((note, i) => {
                             const isPlayingNow = Math.abs(currentBeat - note.startTime) < 0.15 && isPlaying;
                             const stringIndex = note.string - 1; // 0 (High E) to 6 (Low B)
                             
                             return (
                                 <div
                                    key={i}
                                    className={`
                                        absolute w-6 h-6 -ml-3 flex items-center justify-center text-sm font-bold rounded-full z-10 cursor-pointer transition-transform
                                        ${isPlayingNow ? 'bg-red-500 text-white scale-125 shadow-lg shadow-red-500/50' : 'bg-white text-slate-900 border border-slate-400 hover:border-slate-800 hover:scale-110 shadow-sm'}
                                    `}
                                    style={{
                                        left: note.startTime * beatWidth + (beatWidth/4), // Slight offset
                                        top: tabTopPadding + (stringIndex * stringSpacing) - 12 // Center on line
                                    }}
                                    onClick={() => playInstrumentNote(getFrequency(note.note, note.octave), instrument, 0.5)}
                                 >
                                     {note.fret}
                                 </div>
                             );
                         })}
                     </div>
                 </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-full flex flex-col">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Wand2 className="text-yellow-500" />
                        Gerador de Progressões
                    </h2>
                    <p className="text-xs text-slate-400">Harmonia brasileira e linhas de baixo automático (IA)</p>
                 </div>
                 
                 <div className="flex gap-2">
                    <button 
                        onClick={exportAudio}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-colors disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileAudio size={14} />}
                        .WAV
                    </button>
                    <button 
                        onClick={exportPDF}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-colors disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        PDF
                    </button>
                    <button 
                        onClick={handleForceGenerate}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg text-sm font-bold shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
                    >
                        <RefreshCw size={16} /> Nova Variação
                    </button>
                 </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex gap-1">
                    <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tom</label>
                        <select 
                            value={key} 
                            onChange={e => setKey(e.target.value as NoteName)}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                        >
                            {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="w-16">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Modo</label>
                        <button 
                            onClick={() => setTonality(prev => prev === 'Major' ? 'Minor' : 'Major')}
                            className={`w-full text-sm font-bold rounded py-1 border transition-colors ${tonality === 'Minor' ? 'bg-purple-900/40 text-purple-300 border-purple-500' : 'bg-slate-800 text-slate-300 border-slate-600'}`}
                        >
                            {tonality === 'Major' ? 'Maior' : 'Menor'}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Estilo</label>
                    <select 
                        value={style} 
                        onChange={e => setStyle(e.target.value as RhythmStyle)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    >
                        {Object.values(RhythmStyle).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                
                 <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Fraseado</label>
                    <select 
                        value={density} 
                        onChange={e => setDensity(e.target.value === 'auto' || e.target.value === 'scale' ? e.target.value as any : Number(e.target.value) as NoteDensity)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm focus:border-yellow-500 outline-none"
                    >
                        <option value="auto">Automático</option>
                        <option value="scale">Escala (Modelo Partitura)</option>
                        <option value="2">2 Notas (Mínimo)</option>
                        <option value="3">3 Notas (Tríade)</option>
                        <option value="5">5 Notas (Penta)</option>
                        <option value="7">7 Notas (Escala)</option>
                        <option value="10">10 Notas (Virtuoso)</option>
                    </select>
                </div>

                <div className="md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Timbre</label>
                    <select 
                        value={instrument} 
                        onChange={e => setInstrument(e.target.value as InstrumentType)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm focus:border-yellow-500 outline-none"
                    >
                        <option value="nylon">Violão 7 Nylon</option>
                        <option value="steel">Violão de Aço</option>
                        <option value="bass">Baixo Elétrico</option>
                        <option value="trombone">Trombone</option>
                    </select>
                </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">7ª Corda</label>
                    <select 
                        value={tuning} 
                        onChange={e => setTuning(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    >
                        <option value={SeventhStringTuning.B}>Si (B)</option>
                        <option value={SeventhStringTuning.C}>Dó (C)</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">BPM: {tempo}</label>
                    <input 
                        type="range" min="40" max="180" value={tempo} 
                        onChange={e => setTempo(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg accent-yellow-500"
                    />
                </div>
            </div>

            {/* --- VISUALIZER --- */}
            {renderTimeline()}

            {/* --- PLAYER --- */}
            <div className="mt-auto flex justify-center gap-4">
                 {!isPlaying ? (
                    <button
                        onClick={play}
                        className="flex items-center gap-2 px-8 py-4 rounded-full bg-green-500 text-slate-900 font-bold text-lg shadow-xl shadow-green-900/20 hover:bg-green-400 hover:scale-105 transition-all"
                    >
                        <Play fill="currentColor" size={24} /> Ouvir Baixaria
                    </button>
                 ) : (
                    <button
                        onClick={stop}
                        className="flex items-center gap-2 px-8 py-4 rounded-full bg-red-500 text-white font-bold text-lg shadow-xl shadow-red-900/20 hover:bg-red-400 hover:scale-105 transition-all"
                    >
                        <Square fill="currentColor" size={24} /> PARAR
                    </button>
                 )}
            </div>

            <div className="mt-4 text-center">
                 <p className="text-xs text-slate-500">
                    Dica: Experimente o trombone para simular a condução de metais nas rodas de choro.
                 </p>
            </div>
        </div>
    );
};
