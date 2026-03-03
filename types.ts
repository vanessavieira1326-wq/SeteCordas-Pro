
export enum SeventhStringTuning {
  B = 'B (Si - Padrão)',
  C = 'C (Dó - Samba/Choro)',
  A = 'A (Lá - Grave)',
}

export enum RhythmStyle {
  SAMBA = 'Samba',
  CHORO = 'Choro',
  BOSSA_NOVA = 'Bossa Nova',
  BAIAO = 'Baião',
  SAMBA_CANCAO = 'Samba-canção',
  PARTIDO_ALTO = 'Partido Alto',
  MAXIXE = 'Maxixe',
}

export interface GuitarString {
  note: string;
  octave: number;
  frequency: number;
  description?: string;
}

export interface RhythmPreset {
  name: RhythmStyle;
  description: string;
  countPattern: string;
  bpmRanges: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  accentBeat: number[]; // 1-based index of beats to accent
  subdivision: number; // 2 for 8th notes, 4 for 16th notes
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8';
export type Subdivision = '1' | '2' | '3' | '4'; // Quarter, 8th, Triplet, 16th

// --- NEW TYPES FOR ADVANCED TRAINER ---

export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type ChordQuality = 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | '6' | 'm6' | 'm';
export type Tonality = 'Major' | 'Minor';

// Updated instrument list
export type InstrumentType = 
  | 'nylon' 
  | 'steel' 
  | 'piano' 
  | 'keyboard' 
  | 'bass' 
  | 'sax' 
  | 'clarinet' 
  | 'trombone' 
  | 'trumpet' 
  | 'flute' 
  | 'harmonica' 
  | 'cavaco';

export type NoteDensity = 'auto' | 2 | 3 | 5 | 7 | 10;

export interface Chord {
  root: NoteName;
  quality: ChordQuality;
  display: string; // e.g., "Am7"
  duration: number; // in beats (usually 2 or 4)
}

export interface BassNote {
  note: NoteName;
  octave: number;
  string: number; // 1-7
  fret: number;
  duration: number; // 0.25 (16th), 0.5 (8th), 1 (quarter)
  startTime: number; // offset in beats from start of progression
  isChordTone?: boolean;
  isChromatic?: boolean;
}

export interface Progression {
  id: string;
  key: NoteName;
  chords: Chord[];
  style: RhythmStyle;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
}

export interface FretboardNote {
  stringIndex: number; // 0 (High E) to 6 (Low B/C)
  fret: number;
  note: NoteName;
  interval?: string; // e.g., "R", "3M", "5J"
  isActive: boolean;
}

export interface BassLick {
  id: string;
  title: string;
  style: RhythmStyle;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  description: string;
  tuningRequired: SeventhStringTuning;
  progression: Chord[]; // The harmonic context
  notes: BassNote[];
}

// --- SMART TRAINER TYPES ---

export interface PracticeHit {
  timestamp: number;
  offsetMs: number; // Negative = Rushing, Positive = Dragging
  accuracy: 'perfect' | 'good' | 'late' | 'early' | 'miss';
  beatNumber: number;
}

export interface PracticeSessionResult {
  date: string;
  bpm: number;
  score: number; // 0-100
  avgOffset: number; // ms
  stability: number; // percentage consistency
  tendency: 'Acelerando' | 'Atrasando' | 'Estável';
  hits: PracticeHit[];
}

// --- EVOLUTION SYSTEM TYPES ---

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'trophy' | 'star' | 'zap' | 'target' | 'music' | 'lock';
  unlocked: boolean;
  xpReward: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  total: number;
  progress: number;
  xpReward: number;
  completed: boolean;
  type: 'daily' | 'weekly';
}

export interface UserProfile {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  title: string; // e.g. "Iniciante", "Baixista de Roda"
  streakDays: number;
}

export type AppTab = 'tuner' | 'metronome' | 'fretboard' | 'bass-trainer' | 'rhythms' | 'coach' | 'separator' | 'smart-trainer' | 'evolution' | 'cycle';
