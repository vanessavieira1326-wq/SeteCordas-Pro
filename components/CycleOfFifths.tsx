import React, { useState } from 'react';
import { getCycleOfFifths, getNoteFromInterval, getFrequency } from '../utils/musicTheory';
import { NoteName, SeventhStringTuning } from '../types';
import { ArrowRight, Music, Info, BookOpen, Guitar, Volume2 } from 'lucide-react';
import { HARMONIC_STUDIES } from '../utils/harmonicStudiesData';
import { playInstrumentNote } from '../utils/audio';

export const CycleOfFifths: React.FC = () => {
  const [selectedRoot, setSelectedRoot] = useState<NoteName>('C');
  const [activeTuning, setActiveTuning] = useState<SeventhStringTuning>(SeventhStringTuning.C);
  const cycleNotes = getCycleOfFifths('C'); // Always start visual cycle at C for standard view

  // Helper to play note
  const playNote = (note: NoteName, octave: number = 3) => {
    const freq = getFrequency(note, octave);
    playInstrumentNote(freq, 'nylon', 1.5);
  };

  // Helper to calculate position on circle
  const getPosition = (index: number, total: number = 12, radius: number = 120) => {
    const angle = (index * (360 / total)) - 90; // -90 to start at top
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    return { x, y };
  };

  // Get chords for the selected key (Major scale)
  // I: Major, ii: minor, iii: minor, IV: Major, V: Major, vi: minor, vii: dim
  const getDiatonicChords = (root: NoteName) => {
    const scale = [0, 2, 4, 5, 7, 9, 11]; // Major scale intervals
    const qualities = ['7M', 'm7', 'm7', '7M', '7', 'm7', 'm7b5'];
    
    return scale.map((interval, i) => {
      const note = getNoteFromInterval(root, interval);
      return { note, quality: qualities[i], degree: i + 1 };
    });
  };

  const diatonicChords = getDiatonicChords(selectedRoot);

  return (
    <div className="flex flex-col items-center min-h-full p-4 space-y-12 animate-in fade-in duration-500 pb-24">
      
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center gap-2">
          <Music className="text-indigo-400" /> Ciclo de Quintas
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Ferramenta essencial para compositores e improvisadores. Visualize a relação entre as tonalidades.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full max-w-5xl">
        
        {/* Interactive Circle */}
        <div className="relative w-[320px] h-[320px] mx-auto">
          {/* Center Info */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{selectedRoot}</div>
              <div className="text-slate-500 text-sm uppercase tracking-widest">Maior</div>
            </div>
          </div>

          {/* Connecting Lines (Decorational) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <circle cx="50%" cy="50%" r="120" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-600" />
            <circle cx="50%" cy="50%" r="80" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-700" />
          </svg>

          {/* Notes around the circle */}
          {cycleNotes.map((note, index) => {
            const { x, y } = getPosition(index);
            const isSelected = note === selectedRoot;
            
            return (
              <button
                key={note}
                onClick={() => {
                  setSelectedRoot(note);
                  playNote(note, 3);
                }}
                className={`absolute w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-lg
                  ${isSelected 
                    ? 'bg-indigo-500 text-white scale-125 ring-4 ring-indigo-500/30 z-20' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white hover:scale-110 z-10 border border-slate-700'
                  }`}
                style={{
                  left: `calc(50% + ${x}px - 24px)`,
                  top: `calc(50% + ${y}px - 24px)`,
                }}
              >
                {note}
              </button>
            );
          })}
        </div>

        {/* Info Panel */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Campo Harmônico de {selectedRoot}
            </h3>
            <div className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase">
              Tom Maior
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {diatonicChords.map((chord, index) => (
              <button 
                key={index}
                onClick={() => playNote(chord.note, 3)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95
                  ${index === 0 // Tonic
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' 
                    : index === 4 // Dominant
                    ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-200'
                    : index === 3 // Subdominant
                    ? 'bg-green-600/20 border-green-500/50 text-green-200'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }
                `}
              >
                <span className="text-xs opacity-50 font-mono">
                  {['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][index]}
                </span>
                <span className="text-lg font-bold">
                  {chord.note}<span className="text-xs font-normal opacity-80">{chord.quality}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} /> Funções Principais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-slate-500 text-xs mb-1">Tônica (I)</div>
                <div className="font-bold text-indigo-300">{diatonicChords[0].note}{diatonicChords[0].quality}</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-slate-500 text-xs mb-1">Subdominante (IV)</div>
                <div className="font-bold text-green-300">{diatonicChords[3].note}{diatonicChords[3].quality}</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-slate-500 text-xs mb-1">Dominante (V)</div>
                <div className="font-bold text-yellow-300">{diatonicChords[4].note}{diatonicChords[4].quality}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-700">
             <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Relativa Menor:</span>
                <span className="font-bold text-white text-lg">{diatonicChords[5].note}m</span>
             </div>
          </div>

        </div>
      </div>

      {/* --- HARMONIC STUDIES SECTION --- */}
      <div className="w-full max-w-5xl mt-16 border-t border-slate-800 pt-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="text-purple-400" /> Estudos de Baixaria
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Ciclos e progressões essenciais para o violão de 7 cordas.
            </p>
          </div>
          
          {/* Tuning Selector for Studies */}
          <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
            <span className="text-xs font-bold text-slate-400 px-2">Afinação 7ª:</span>
            {[SeventhStringTuning.C, SeventhStringTuning.B, SeventhStringTuning.A].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTuning(t)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeTuning === t 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {t.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {HARMONIC_STUDIES.map((study) => (
            <div key={study.id} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-purple-300 mb-1">{study.title}</h3>
                    <p className="text-slate-400 text-sm">{study.description}</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                    <Guitar size={20} className="text-slate-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Progressão</div>
                    <div className="font-mono text-white text-sm md:text-base">{study.progression}</div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Linha de Baixo (7 cordas)</div>
                      <Volume2 size={14} className="text-slate-600" />
                    </div>
                    
                    {/* Interactive Bass Line */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {study.bassSequence[activeTuning].map((noteObj, idx) => (
                        <React.Fragment key={idx}>
                          <button
                            onClick={() => playNote(noteObj.note as NoteName, noteObj.octave)}
                            className={`
                              px-3 py-1.5 rounded-lg font-mono text-sm font-bold transition-all
                              ${noteObj.octave < 3 
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/40' // Low notes
                                : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                              }
                            `}
                            title={`Nota: ${noteObj.note}${noteObj.octave}`}
                          >
                            {noteObj.note}
                            <span className="text-[10px] opacity-60 ml-0.5 align-bottom">{noteObj.octave}</span>
                          </button>
                          {idx < study.bassSequence[activeTuning].length - 1 && (
                            <ArrowRight size={12} className="text-slate-600" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300">
                  <div className="flex gap-3">
                    <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <p><strong className="text-white">Lógica:</strong> {study.explanation}</p>
                  </div>
                  <div className="flex gap-3">
                    <Music size={16} className="text-green-400 shrink-0 mt-0.5" />
                    <p><strong className="text-white">Ritmo:</strong> {study.rhythmSuggestion}</p>
                  </div>
                  
                  {/* Dynamic Tuning Tip */}
                  <div className="mt-4 bg-purple-900/20 border border-purple-500/20 p-4 rounded-xl">
                    <div className="text-xs font-bold text-purple-400 uppercase mb-1">
                      Dica para Afinação em {activeTuning.split(' ')[0]}
                    </div>
                    <p className="text-purple-100/80">
                      {study.tuningTips[activeTuning] || "Nenhuma dica específica para esta afinação."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
