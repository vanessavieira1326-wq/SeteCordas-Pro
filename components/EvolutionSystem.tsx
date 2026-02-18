
import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, Zap, Medal, Lock, CheckCircle2, Crown, Flame, TrendingUp, Music, Shield, Cloud, CloudOff, Check } from 'lucide-react';
import { Achievement, Mission, UserProfile } from '../types';

export const EvolutionSystem: React.FC = () => {
  // --- PERSISTENT STATE ---
  
  // Load User Data
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('scp_user');
    return saved ? JSON.parse(saved) : {
      level: 4,
      currentXp: 850,
      nextLevelXp: 1200,
      title: "Guardão da 7ª Corda",
      streakDays: 5
    };
  });

  // Load Missions
  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem('scp_missions');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Aquecimento Diário', description: 'Pratique 5 minutos no Metrônomo', total: 5, progress: 3, xpReward: 100, completed: false, type: 'daily' },
      { id: '2', title: 'Precisão Cirúrgica', description: 'Atinja 90% de precisão no Smart Trainer', total: 1, progress: 0, xpReward: 150, completed: false, type: 'daily' },
      { id: '3', title: 'Mestre do Samba', description: 'Complete 3 sessões de Samba sem errar', total: 3, progress: 1, xpReward: 500, completed: false, type: 'weekly' },
      { id: '4', title: 'Estudo de Escalas', description: 'Explore o Mapa de Braço por 10 min', total: 10, progress: 10, xpReward: 200, completed: true, type: 'daily' },
    ];
  });

  // State for Sync Simulation
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    // Save to local storage whenever state changes
    setSyncStatus('syncing');
    localStorage.setItem('scp_user', JSON.stringify(user));
    localStorage.setItem('scp_missions', JSON.stringify(missions));
    
    // Simulate Cloud Delay
    const timer = setTimeout(() => {
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }, 800);
    
    return () => clearTimeout(timer);
  }, [user, missions]);


  const [achievements, setAchievements] = useState<Achievement[]>([
      { id: '1', title: 'Primeiro Acorde', description: 'Complete sua primeira sessão.', icon: 'star', unlocked: true, xpReward: 50 },
      { id: '2', title: 'No Groove', description: 'Mantenha estabilidade acima de 95% por 1 min.', icon: 'zap', unlocked: true, xpReward: 100 },
      { id: '3', title: 'Dino 7 Cordas', description: 'Toque 50 baixarias perfeitas.', icon: 'music', unlocked: false, xpReward: 500 },
      { id: '4', title: 'Ouvido Absoluto', description: 'Afine o violão manualmente com precisão.', icon: 'target', unlocked: false, xpReward: 300 },
      { id: '5', title: 'Maratona', description: 'Pratique por 7 dias seguidos.', icon: 'trophy', unlocked: false, xpReward: 1000 },
  ]);

  const ranking = [
      { name: "Dino Fan", xp: 15400, level: 12 },
      { name: "Carlos 7", xp: 12300, level: 10 },
      { name: "Você", xp: user.currentXp + (user.level * 1000), level: user.level, highlight: true },
      { name: "Samba Soul", xp: 4100, level: 4 },
      { name: "Iniciante123", xp: 1200, level: 2 },
  ].sort((a,b) => b.xp - a.xp);

  // --- ACTIONS ---
  
  const collectReward = (missionId: string) => {
      const mission = missions.find(m => m.id === missionId);
      if (mission && mission.completed) {
          // Add XP
          setUser(prev => {
              const newXp = prev.currentXp + mission.xpReward;
              let newLevel = prev.level;
              let nextXp = prev.nextLevelXp;
              
              // Level Up Logic
              if (newXp >= prev.nextLevelXp) {
                  newLevel += 1;
                  nextXp = Math.floor(nextXp * 1.2);
              }

              return {
                  ...prev,
                  currentXp: newXp,
                  level: newLevel,
                  nextLevelXp: nextXp
              };
          });
          
          // Remove from list or mark collected
          setMissions(prev => prev.filter(m => m.id !== missionId));
      }
  };

  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'trophy': return <Trophy size={18} />;
          case 'star': return <Star size={18} />;
          case 'zap': return <Zap size={18} />;
          case 'target': return <Target size={18} />;
          case 'music': return <Music size={18} />;
          default: return <Lock size={18} />;
      }
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 h-full flex flex-col overflow-y-auto custom-scrollbar relative">
      
      {/* --- CLOUD STATUS BAR --- */}
      <div className="absolute top-4 right-6 flex items-center gap-2 text-xs font-medium bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700 backdrop-blur-sm z-20">
          {syncStatus === 'synced' && (
              <>
                 <Cloud size={14} className="text-green-500" /> 
                 <span className="text-green-500">Salvo na Nuvem</span>
              </>
          )}
          {syncStatus === 'syncing' && (
              <>
                 <Cloud size={14} className="text-yellow-500 animate-pulse" /> 
                 <span className="text-yellow-500">Sincronizando...</span>
              </>
          )}
           {syncStatus === 'offline' && (
              <>
                 <CloudOff size={14} className="text-slate-500" /> 
                 <span className="text-slate-500">Offline (Local)</span>
              </>
          )}
      </div>

      {/* --- HEADER PROFILE --- */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border-4 border-slate-800 z-10 relative group cursor-pointer transition-transform hover:scale-105">
                  <span className="text-3xl font-black text-white">{user.level}</span>
                  <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-800 p-1.5 rounded-full border border-slate-600 z-20">
                   <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                       <Flame size={10} fill="currentColor" /> {user.streakDays}
                   </div>
              </div>
          </div>

          <div className="flex-1 w-full text-center md:text-left z-10">
              <div className="flex flex-col md:flex-row md:items-end gap-2 mb-1 justify-center md:justify-start">
                <h2 className="text-2xl font-bold text-white leading-none">{user.title}</h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Conta Gratuita</span>
              </div>
              
              <p className="text-sm text-slate-400 mb-4">Próxima recompensa: "Mestre do Choro" (Nível 5)</p>
              
              {/* XP Bar */}
              <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(234,179,8,0.5)]"
                    style={{ width: `${(user.currentXp / user.nextLevelXp) * 100}%` }}
                  >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md z-10">
                      {user.currentXp} / {user.nextLevelXp} XP
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT COLUMN: MISSIONS --- */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Daily Missions */}
              <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Target className="text-blue-400" /> Missões Ativas
                  </h3>
                  <div className="space-y-3">
                      {missions.length === 0 ? (
                          <div className="p-8 text-center bg-slate-900/30 rounded-xl border border-slate-700/50 text-slate-500 text-sm">
                              Todas as missões completadas! Volte amanhã.
                          </div>
                      ) : missions.map(mission => (
                          <div key={mission.id} className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 flex items-center justify-between group hover:border-slate-600 transition-colors">
                              <div className="flex-1 mr-4">
                                  <div className="flex justify-between mb-1">
                                      <span className={`font-bold text-sm ${mission.completed ? 'text-green-400 line-through opacity-70' : 'text-slate-200'}`}>
                                          {mission.title}
                                      </span>
                                      <span className="text-xs font-bold text-yellow-500 bg-yellow-900/20 px-1.5 py-0.5 rounded">+{mission.xpReward} XP</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-2">{mission.description}</p>
                                  
                                  {/* Progress */}
                                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-500 ${mission.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                                      />
                                  </div>
                              </div>

                              <div>
                                  {mission.completed ? (
                                      <button 
                                        onClick={() => collectReward(mission.id)}
                                        className="bg-green-500 hover:bg-green-400 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-green-500/20 animate-bounce flex items-center gap-1"
                                      >
                                          <Check size={12} /> Coletar
                                      </button>
                                  ) : (
                                      <div className="w-8 h-8 rounded-full border-2 border-slate-700 flex items-center justify-center text-slate-500 font-mono text-xs">
                                          {mission.progress}/{mission.total}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Bass Challenges */}
              <div className="pt-4">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Shield className="text-red-400" /> Desafios de Baixaria
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-red-900/20 to-slate-900 p-4 rounded-xl border border-red-900/30 relative overflow-hidden group cursor-pointer hover:border-red-500/50 transition-all">
                          <div className="absolute right-0 top-0 p-2 opacity-50">
                              <Lock size={20} className="text-red-400" />
                          </div>
                          <div className="font-bold text-red-100 mb-1">O Voo do Besouro</div>
                          <div className="text-xs text-red-300/60 mb-3">Nível: Avançado • Choro</div>
                          <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                              <span className="bg-red-900/40 px-2 py-1 rounded">Requer Nível 10</span>
                          </div>
                      </div>

                      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl border border-slate-700 relative overflow-hidden group cursor-pointer hover:border-green-500/50 transition-all">
                          <div className="absolute right-0 top-0 p-2 opacity-50">
                              <CheckCircle2 size={20} className="text-green-400" />
                          </div>
                          <div className="font-bold text-white mb-1">Escala de Dó Maior</div>
                          <div className="text-xs text-slate-400 mb-3">Nível: Iniciante • Técnica</div>
                          <div className="flex items-center gap-2 text-xs font-bold text-green-400">
                              <span className="bg-green-900/20 px-2 py-1 rounded">Completado</span>
                          </div>
                      </div>
                  </div>
              </div>

          </div>

          {/* --- RIGHT COLUMN: ACHIEVEMENTS & RANKING --- */}
          <div className="space-y-6">
              
              {/* Ranking */}
              <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingUp size={16} /> Ranking Semanal
                  </h3>
                  <div className="space-y-1">
                      {ranking.map((r, i) => (
                          <div 
                            key={i} 
                            className={`flex items-center p-2 rounded-lg text-sm transition-colors ${r.highlight ? 'bg-yellow-500/10 border border-yellow-500/30' : 'hover:bg-slate-800'}`}
                          >
                              <div className={`w-6 font-bold ${i < 3 ? 'text-yellow-500' : 'text-slate-600'}`}>#{i+1}</div>
                              <div className="flex-1 font-medium text-slate-200">
                                  {r.name}
                                  {i === 0 && <Crown size={12} className="inline ml-1 text-yellow-500 mb-0.5" fill="currentColor" />}
                              </div>
                              <div className="text-slate-500 text-xs font-mono">{r.xp} XP</div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Achievements Grid */}
              <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Medal size={16} /> Conquistas
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                      {achievements.map(ach => (
                          <div 
                            key={ach.id} 
                            className={`aspect-square rounded-lg flex items-center justify-center border transition-all relative group cursor-help
                                ${ach.unlocked 
                                    ? 'bg-gradient-to-br from-indigo-500/20 to-slate-800 border-indigo-500/50 text-indigo-400' 
                                    : 'bg-slate-800 border-slate-700 text-slate-600 opacity-60'}
                            `}
                          >
                              {getIcon(ach.icon)}
                              
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-[10px] p-3 rounded-lg border border-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity text-center shadow-2xl">
                                  <div className="font-bold mb-1 text-yellow-400 text-xs">{ach.title}</div>
                                  <div className="text-slate-300 leading-tight">{ach.description}</div>
                                  {!ach.unlocked && <div className="mt-2 text-red-400 font-bold bg-red-900/20 py-1 rounded">Bloqueado</div>}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};
