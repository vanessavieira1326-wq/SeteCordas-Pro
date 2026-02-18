import React, { useState, useEffect } from 'react';
import { SeventhStringTuning, NoteName } from '../types';
import { SCALES, ScaleType, INTERVAL_NAMES, NOTES, getNoteIndex } from '../utils/musicTheory';
import { playSuccessSound } from '../utils/audio';
import { Layers, Eye, Music, GitBranch, ArrowRight } from 'lucide-react';

interface FretboardProps {
  tuning: SeventhStringTuning;
}

// Helper to get frequency roughly (simplified for visualization clicks)
const getFrequency = (stringIndex: number, fret: number, tuning: SeventhStringTuning): number => {
    const standardOpen = [329.63, 246.94, 196.00, 146.83, 110.00, 82.41];
    let seventhFreq = 61.74; // B1
    if (tuning.includes('C')) seventhFreq = 65.41; // C2
    if (tuning.includes('A')) seventhFreq = 55.00; // A1

    const baseFreq = stringIndex === 6 ? seventhFreq : standardOpen[stringIndex];
    return baseFreq * Math.pow(2, fret / 12);
};

const getNoteAtFret = (openNote: NoteName, fret: number): NoteName => {
  const openIndex = NOTES.indexOf(openNote);
  return NOTES[(openIndex + fret) % 12];
};

export const Fretboard: React.FC<FretboardProps> = ({ tuning }) => {
  // State
  const [rootNote, setRootNote] = useState<NoteName>('C');
  const [scaleType, setScaleType] = useState<ScaleType>('Major');
  const [displayMode, setDisplayMode] = useState<'notes' | 'intervals'>('intervals');
  const [viewMode, setViewMode] = useState<'scale' | 'arpeggio'>('scale');
  const [arpeggioFocus, setArpeggioFocus] = useState<number | null>(null); // Index of chord in harmonic field (1-7)

  // Configuration
  const stringNotes: NoteName[] = ['E', 'B', 'G', 'D', 'A', 'E', tuning.includes('C') ? 'C' : tuning.includes('A') ? 'A' : 'B'];
  
  // Logic
  const rootIndex = getNoteIndex(rootNote);
  const scaleIntervals = SCALES[scaleType];
  
  // Calculate valid notes in current scale
  // Set of intervals from root that are valid
  const activeIntervals = new Set(scaleIntervals);

  // Harmonic Field Logic (Simplified Diatonic Triads/7ths)
  // We generate the 7 chords of the key
  const harmonicField = scaleIntervals.map((interval, index) => {
      const chordRoot = NOTES[(rootIndex + interval) % 12];
      
      // Determine quality based on thirds stacking within the scale
      // 3rd = index + 2, 5th = index + 4, 7th = index + 6 (wrapping around scale length)
      const thirdIndex = (index + 2) % 7;
      const fifthIndex = (index + 4) % 7;
      const seventhIndex = (index + 6) % 7;

      // Calculate interval distance from chord root to chord third
      // To do this accurately, we need cumulative semitones
      // This is complex for all modes, so for UI simplicity in this context, 
      // we might hardcode the standard Major/Minor field patterns or calculate dynamically.
      
      // Dynamic Calculation:
      const getSemi = (idx: number) => scaleIntervals[idx]; 
      const rootSemi = getSemi(index);
      
      // Wrap logic: if index wraps, add 12 semitones
      let thirdSemi = getSemi(thirdIndex);
      if (thirdIndex < index) thirdSemi += 12;
      
      let fifthSemi = getSemi(fifthIndex);
      if (fifthIndex < index) fifthSemi += 12;

      let seventhSemi = getSemi(seventhIndex);
      if (seventhIndex < index) seventhSemi += 12;

      const distThird = thirdSemi - rootSemi;
      const distSeventh = seventhSemi - rootSemi;

      let suffix = '';
      if (distThird === 4 && distSeventh === 11) suffix = 'maj7';
      else if (distThird === 4 && distSeventh === 10) suffix = '7';
      else if (distThird === 3 && distSeventh === 10 && (fifthSemi - rootSemi) === 6) suffix = 'm7b5';
      else if (distThird === 3 && distSeventh === 10) suffix = 'm7';
      else if (distThird === 3 && distSeventh === 9) suffix = 'dim7'; // Rough approx
      else suffix = ''; 

      return {
          degree: index + 1,
          roman: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][index],
          root: chordRoot,
          name: `${chordRoot}${suffix}`,
          intervals: [0, thirdSemi - rootSemi, fifthSemi - rootSemi, seventhSemi - rootSemi] // Relative to chord root
      };
  });

  const getIntervalFromRoot = (note: NoteName): number => {
      const noteIdx = getNoteIndex(note);
      return (noteIdx - rootIndex + 12) % 12;
  };

  const handleNoteClick = (strIndex: number, fret: number) => {
      const freq = getFrequency(strIndex, fret, tuning);
      playSuccessSound(freq);
  };

  const selectArpeggio = (degreeIndex: number) => {
      if (viewMode === 'arpeggio' && arpeggioFocus === degreeIndex) {
          setViewMode('scale');
          setArpeggioFocus(null);
      } else {
          setViewMode('arpeggio');
          setArpeggioFocus(degreeIndex);
      }
  };

  const renderFret = (strIndex: number, fret: number) => {
    const openNote = stringNotes[strIndex];
    const note = getNoteAtFret(openNote, fret);
    const intervalFromKeyRoot = getIntervalFromRoot(note);
    
    // Visibility Logic
    let isVisible = false;
    let isChordTone = false;
    let isRoot = false;
    let label = '';
    let colorClass = 'bg-slate-800 text-slate-500 opacity-0';

    if (viewMode === 'scale') {
        if (activeIntervals.has(intervalFromKeyRoot)) {
            isVisible = true;
            isRoot = intervalFromKeyRoot === 0;
            // Highlight specific intervals
            if (isRoot) colorClass = 'bg-red-500 text-white shadow-red-500/50';
            else if (intervalFromKeyRoot === 7) colorClass = 'bg-indigo-500 text-white'; // 5th
            else if (intervalFromKeyRoot === 4 || intervalFromKeyRoot === 3) colorClass = 'bg-yellow-500 text-slate-900'; // 3rds
            else colorClass = 'bg-slate-600 text-slate-200';
        }
    } else if (viewMode === 'arpeggio' && arpeggioFocus !== null) {
        // Check if note belongs to selected chord
        const chord = harmonicField[arpeggioFocus];
        // chord.intervals are relative to CHORD root.
        // intervalFromKeyRoot is relative to KEY root.
        
        // We need interval relative to CHORD root
        const chordRootIdx = getNoteIndex(chord.root);
        const noteIdx = getNoteIndex(note);
        const intervalFromChordRoot = (noteIdx - chordRootIdx + 12) % 12;
        
        if (chord.intervals.includes(intervalFromChordRoot)) {
            isVisible = true;
            isRoot = intervalFromChordRoot === 0;
            isChordTone = true;
            
            if (isRoot) colorClass = 'bg-pink-500 text-white shadow-pink-500/50'; // Chord Root
            else if (intervalFromChordRoot === 7) colorClass = 'bg-purple-500 text-white';
            else if (intervalFromChordRoot === 3 || intervalFromChordRoot === 4) colorClass = 'bg-yellow-500 text-slate-900';
            else colorClass = 'bg-slate-500 text-white';
        } else if (activeIntervals.has(intervalFromKeyRoot)) {
             // Ghost notes for scale
             isVisible = true;
             colorClass = 'bg-slate-800/50 text-slate-600 border border-slate-700';
        }
    }

    // Label Logic
    if (isVisible) {
        if (displayMode === 'notes') {
            label = note;
        } else {
            // If Arpeggio mode, show interval relative to CHORD
            if (viewMode === 'arpeggio' && arpeggioFocus !== null) {
                const chord = harmonicField[arpeggioFocus];
                const noteIdx = getNoteIndex(note);
                const chordRootIdx = getNoteIndex(chord.root);
                const intVal = (noteIdx - chordRootIdx + 12) % 12;
                label = INTERVAL_NAMES[intVal] || '?';
            } else {
                // Scale mode
                label = INTERVAL_NAMES[intervalFromKeyRoot] || '?';
            }
        }
    }

    return (
      <div 
        key={fret} 
        className="flex-1 relative flex items-center justify-center border-r border-slate-600 h-full group"
        onClick={() => handleNoteClick(strIndex, fret)}
      >
        {/* String Line */}
        <div className={`absolute w-full h-[1px] ${strIndex === 6 ? 'bg-yellow-600 h-[2px] shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'bg-slate-500/30'} z-0`}></div>
        
        {/* Fret Markers */}
        {(fret === 3 || fret === 5 || fret === 7 || fret === 9 || fret === 15 || fret === 17) && strIndex === 3 && (
            <div className="absolute w-2 h-2 rounded-full bg-slate-700 z-0"></div>
        )}
        {(fret === 12) && (strIndex === 2 || strIndex === 4) && (
             <div className="absolute w-2 h-2 rounded-full bg-slate-700 z-0"></div>
        )}

        {/* Note Circle */}
        <div className={`
            relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm cursor-pointer transition-all duration-200
            ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover:opacity-30 group-hover:scale-75 group-hover:bg-slate-700'}
            ${colorClass}
        `}>
            {label}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-full flex flex-col overflow-hidden">
        
        {/* TOP CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            {/* 1. Key & Scale */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <Music size={14} /> Tonalidade & Escala
                </div>
                <div className="flex gap-2">
                    <select 
                        value={rootNote} 
                        onChange={(e) => setRootNote(e.target.value as NoteName)}
                        className="bg-slate-800 border border-slate-600 text-white text-sm rounded px-2 py-1 flex-1 font-bold"
                    >
                        {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select 
                        value={scaleType} 
                        onChange={(e) => setScaleType(e.target.value as ScaleType)}
                        className="bg-slate-800 border border-slate-600 text-white text-sm rounded px-2 py-1 flex-[2]"
                    >
                        {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. Visualization Toggles */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                 <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold text-xs uppercase tracking-wider">
                    <Eye size={14} /> Visualização
                </div>
                <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
                    <button 
                        onClick={() => setDisplayMode('intervals')}
                        className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${displayMode === 'intervals' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Graus (T, 3, 5)
                    </button>
                    <button 
                        onClick={() => setDisplayMode('notes')}
                        className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${displayMode === 'notes' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Notas (C, E, G)
                    </button>
                </div>
            </div>

            {/* 3. 7th String Indicator */}
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col justify-center">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">7ª Corda Afinada em:</span>
                    <span className="text-xl font-black text-yellow-500">{tuning.split('(')[0]}</span>
                 </div>
                 <div className="text-[10px] text-slate-500 mt-1">
                    Ideal para baixarias em {tuning.includes('C') ? 'Do Maior / Sol' : 'Si / Mi Menor'}.
                 </div>
            </div>
        </div>

        {/* HARMONIC FIELD BAR */}
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-pink-400 font-bold text-xs uppercase tracking-wider">
                <GitBranch size={14} /> Campo Harmônico (Clique para ver arpejos)
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {harmonicField.map((chord, idx) => {
                    const isActive = viewMode === 'arpeggio' && arpeggioFocus === idx;
                    return (
                        <button
                            key={idx}
                            onClick={() => selectArpeggio(idx)}
                            className={`
                                min-w-[70px] flex-1 py-2 px-3 rounded-lg border flex flex-col items-center justify-center transition-all
                                ${isActive 
                                    ? 'bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-900/50 scale-105' 
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-pink-500/50 hover:text-pink-200'}
                            `}
                        >
                            <span className="text-[10px] opacity-70 mb-1">{chord.roman}</span>
                            <span className="font-bold text-sm whitespace-nowrap">{chord.name}</span>
                        </button>
                    )
                })}
            </div>
        </div>

        {/* NECK CONTAINER */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-900 rounded-xl border border-slate-700 relative select-none shadow-inner">
            <div className="min-w-[900px] h-full flex flex-col py-6 pr-6 pl-2">
                {stringNotes.map((note, strIndex) => (
                    <div key={strIndex} className="flex-1 flex items-center">
                        {/* String Label (Open Note) */}
                        <div 
                            className={`
                                w-10 flex items-center justify-center border-r-4 z-20 h-full shadow-2xl relative
                                ${strIndex === 6 ? 'border-yellow-600 bg-slate-800' : 'border-slate-600 bg-slate-800'}
                            `}
                            onClick={() => handleNoteClick(strIndex, 0)}
                        >
                             <span className={`text-sm font-black ${strIndex === 6 ? 'text-yellow-500' : 'text-slate-300'}`}>{note}</span>
                             {strIndex === 6 && <div className="absolute -left-2 w-1 h-full bg-yellow-500/20"></div>}
                        </div>
                        
                        {/* Frets 1-19 */}
                        {Array.from({length: 19}).map((_, i) => renderFret(strIndex, i + 1))}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Footer Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-500 justify-center">
             <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Tônica</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Terça (3M/3m)</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-indigo-500"></div> Quinta (5J)</div>
             {viewMode === 'arpeggio' && <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Sétima</div>}
             <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600"></div> Corda 7 (Baixaria)</div>
        </div>

    </div>
  );
};