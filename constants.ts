import { GuitarString, RhythmPreset, RhythmStyle, SeventhStringTuning } from './types';

export const STANDARD_STRINGS: GuitarString[] = [
  { note: 'E', octave: 4, frequency: 329.63 },
  { note: 'B', octave: 3, frequency: 246.94 },
  { note: 'G', octave: 3, frequency: 196.00 },
  { note: 'D', octave: 3, frequency: 146.83 },
  { note: 'A', octave: 2, frequency: 110.00 },
  { note: 'E', octave: 2, frequency: 82.41 },
];

export const SEVENTH_STRING_OPTIONS: Record<SeventhStringTuning, GuitarString> = {
  [SeventhStringTuning.B]: { note: 'B', octave: 1, frequency: 61.74, description: 'Afinação Padrão de 7 cordas' },
  [SeventhStringTuning.C]: { note: 'C', octave: 2, frequency: 65.41, description: 'Comum para Samba e Choro (Baixaria)' },
  [SeventhStringTuning.A]: { note: 'A', octave: 1, frequency: 55.00, description: 'Extensão grave extra' },
};

export const RHYTHM_PRESETS: RhythmPreset[] = [
  {
    name: RhythmStyle.SAMBA,
    description: 'O coração do Brasil. Foco na acentuação forte do tempo 2 (surdo).',
    countPattern: '1 (e) 2 (e) - "tum-TA-tum-tum"',
    bpmRanges: { beginner: 80, intermediate: 100, advanced: 120 },
    accentBeat: [2, 4], 
    subdivision: 2,
  },
  {
    name: RhythmStyle.CHORO,
    description: 'Rápido, melódico e técnico. A 7ª corda conduz o contraponto.',
    countPattern: '1 e & a 2 e & a - Semicolcheias contínuas',
    bpmRanges: { beginner: 60, intermediate: 90, advanced: 130 },
    accentBeat: [1, 3], // Choro often feels 2/4
    subdivision: 4,
  },
  {
    name: RhythmStyle.BOSSA_NOVA,
    description: 'Sincopado e suave. Harmonia influenciada pelo Jazz.',
    countPattern: 'Claves sincopadas',
    bpmRanges: { beginner: 100, intermediate: 130, advanced: 160 }, // Bossa is often counted in cut time, but here we treat quarter notes
    accentBeat: [1], 
    subdivision: 2,
  },
  {
    name: RhythmStyle.BAIAO,
    description: 'Ritmo nordestino. Padrão de bumbo sincopado.',
    countPattern: 'Batida de Baião: Tônica - 5ª - Oitava',
    bpmRanges: { beginner: 85, intermediate: 105, advanced: 130 },
    accentBeat: [1, 4], // Simplified feeling
    subdivision: 2,
  },
];