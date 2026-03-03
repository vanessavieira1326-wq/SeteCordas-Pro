
import React, { useState, useEffect } from 'react';
import { Tuner } from './components/Tuner';
import { Metronome } from './components/Metronome';
import { PracticeCoach } from './components/PracticeCoach';
import { Fretboard } from './components/Fretboard';
import { BassTrainer } from './components/BassTrainer';
import { RhythmLibrary } from './components/RhythmLibrary';
import { AudioSeparator } from './components/AudioSeparator';
import { SmartTrainer } from './components/SmartTrainer';
import { EvolutionSystem } from './components/EvolutionSystem';
import { CycleOfFifths } from './components/CycleOfFifths';
import { SeventhStringTuning, RhythmStyle, AppTab } from './types';
import { getAudioContext } from './utils/audio';
import { Music, Mic2, Disc, Sparkles, Grid3x3, Activity, Wand2, SplitSquareHorizontal, Trophy, WifiOff, CircleDashed } from 'lucide-react';

const App: React.FC = () => {
  const [tuning, setTuning] = useState<SeventhStringTuning>(SeventhStringTuning.C);
  const [rhythm, setRhythm] = useState<RhythmStyle>(RhythmStyle.SAMBA);
  const [activeTab, setActiveTab] = useState<AppTab>('tuner');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- LOW LATENCY AUDIO UNLOCK ---
  useEffect(() => {
    // IOS/Android Requirement: Unlock AudioContext on first interaction
    const unlockAudio = () => {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
           console.log("Audio Engine Unlocked - Low Latency Ready");
        });
      }
    };
    
    // Listeners for any interaction
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    
    // Network Status Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-yellow-500/30 font-sans">
      
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-red-500/90 text-white text-xs font-bold text-center py-1 absolute top-0 w-full z-50 backdrop-blur flex items-center justify-center gap-2">
           <WifiOff size={12} /> MODO OFFLINE ATIVO - Funcionalidades de IA limitadas
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-900/20">
                <Music className="text-slate-900" size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-400 to-green-400">
                SeteCordas Pro
                </h1>
            </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden xl:flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                <button 
                    onClick={() => setActiveTab('tuner')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'tuner' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Mic2 size={14} /> Afinador
                </button>
                <button 
                    onClick={() => setActiveTab('smart-trainer')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'smart-trainer' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Activity size={14} /> Smart
                </button>
                <button 
                    onClick={() => setActiveTab('evolution')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'evolution' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Trophy size={14} /> Evolução
                </button>
                <button 
                    onClick={() => setActiveTab('fretboard')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'fretboard' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Grid3x3 size={14} /> Mapa
                </button>
                <button 
                    onClick={() => setActiveTab('cycle')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'cycle' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <CircleDashed size={14} /> Ciclo
                </button>
                 <button 
                    onClick={() => setActiveTab('bass-trainer')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'bass-trainer' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Wand2 size={14} /> Gerador
                </button>
                <button 
                    onClick={() => setActiveTab('metronome')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'metronome' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Disc size={14} /> Metrônomo
                </button>
                <button 
                    onClick={() => setActiveTab('separator')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'separator' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <SplitSquareHorizontal size={14} /> Studio
                </button>
                <button 
                    onClick={() => setActiveTab('coach')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'coach' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Sparkles size={14} /> Treinador
                </button>
            </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 pb-24 md:pb-8">
        
        {/* Tab Content Wrapper with Fade Effect */}
        <div className="h-full min-h-[500px] animate-in fade-in duration-300">
            <div className={activeTab === 'tuner' ? 'block h-full' : 'hidden'}>
                <Tuner currentTuning={tuning} onTuningChange={setTuning} />
            </div>
            
            <div className={activeTab === 'smart-trainer' ? 'block h-full' : 'hidden'}>
                <SmartTrainer />
            </div>

            <div className={activeTab === 'evolution' ? 'block h-full' : 'hidden'}>
                <EvolutionSystem />
            </div>
            
            <div className={activeTab === 'fretboard' ? 'block h-full' : 'hidden'}>
                <Fretboard tuning={tuning} />
            </div>

            <div className={activeTab === 'cycle' ? 'block h-full' : 'hidden'}>
                <CycleOfFifths />
            </div>

            <div className={activeTab === 'bass-trainer' ? 'block h-full' : 'hidden'}>
                <BassTrainer />
            </div>

            <div className={activeTab === 'metronome' ? 'block h-full' : 'hidden'}>
                <Metronome selectedRhythm={rhythm} onRhythmChange={setRhythm} />
            </div>

            <div className={activeTab === 'rhythms' ? 'block h-full' : 'hidden'}>
                <RhythmLibrary />
            </div>

            <div className={activeTab === 'separator' ? 'block h-full' : 'hidden'}>
                <AudioSeparator />
            </div>

            <div className={activeTab === 'coach' ? 'block h-full' : 'hidden'}>
                <PracticeCoach tuning={tuning} rhythm={rhythm} />
            </div>
        </div>

      </main>

      {/* Mobile Bottom Navigation - Scrollable & Glassmorphism */}
      <div className="xl:hidden fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 z-50 overflow-x-auto custom-scrollbar safe-area-bottom">
          <div className="flex h-16 min-w-max px-2 items-center">
            <button onClick={() => setActiveTab('tuner')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'tuner' ? 'text-yellow-500' : 'text-slate-500'}`}>
                <Mic2 size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Afinar</span>
            </button>
            <button onClick={() => setActiveTab('smart-trainer')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'smart-trainer' ? 'text-blue-400' : 'text-slate-500'}`}>
                <Activity size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Smart</span>
            </button>
            <button onClick={() => setActiveTab('evolution')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'evolution' ? 'text-orange-400' : 'text-slate-500'}`}>
                <Trophy size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Nível</span>
            </button>
            <button onClick={() => setActiveTab('fretboard')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'fretboard' ? 'text-indigo-400' : 'text-slate-500'}`}>
                <Grid3x3 size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Mapa</span>
            </button>
            <button onClick={() => setActiveTab('cycle')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'cycle' ? 'text-purple-400' : 'text-slate-500'}`}>
                <CircleDashed size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Ciclo</span>
            </button>
             <button onClick={() => setActiveTab('bass-trainer')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'bass-trainer' ? 'text-red-400' : 'text-slate-500'}`}>
                <Wand2 size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Gerador</span>
            </button>
            <button onClick={() => setActiveTab('metronome')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'metronome' ? 'text-green-500' : 'text-slate-500'}`}>
                <Disc size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Metrô</span>
            </button>
             <button onClick={() => setActiveTab('separator')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'separator' ? 'text-teal-400' : 'text-slate-500'}`}>
                <SplitSquareHorizontal size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">Studio</span>
            </button>
            <button onClick={() => setActiveTab('coach')} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1.5 transition-colors ${activeTab === 'coach' ? 'text-blue-400' : 'text-slate-500'}`}>
                <Sparkles size={20} /><span className="text-[9px] font-bold uppercase tracking-wide">IA</span>
            </button>
          </div>
      </div>

    </div>
  );
};

export default App;
