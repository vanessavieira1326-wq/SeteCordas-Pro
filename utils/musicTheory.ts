
import { NoteName, Chord, ChordQuality, SeventhStringTuning } from '../types';

export const NOTES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Map chords to their intervals (semitones from root)
export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  'maj7': [0, 4, 7, 11],
  '7': [0, 4, 7, 10],
  'm7': [0, 3, 7, 10],
  'm7b5': [0, 3, 6, 10],
  'dim7': [0, 3, 6, 9],
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  'm': [0, 3, 7],
};

// --- SCALES & MODES ---
export type ScaleType = 'Major' | 'Minor' | 'Harmonic Minor' | 'Melodic Minor' | 'Dorian' | 'Phrygian' | 'Lydian' | 'Mixolydian' | 'Locrian';

export const SCALES: Record<ScaleType, number[]> = {
    'Major': [0, 2, 4, 5, 7, 9, 11], // Ionian
    'Minor': [0, 2, 3, 5, 7, 8, 10], // Aeolian
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11], // Common in Choro
    'Melodic Minor': [0, 2, 3, 5, 7, 9, 11], // Common in Brazilian Jazz
    'Dorian': [0, 2, 3, 5, 7, 9, 10], // Minor 6 feel
    'Phrygian': [0, 1, 3, 5, 7, 8, 10], // Nordeste/Baião feel sometimes
    'Lydian': [0, 2, 4, 6, 7, 9, 11],
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10], // Dominant/Samba
    'Locrian': [0, 1, 3, 5, 6, 8, 10]
};

export const INTERVAL_NAMES: Record<number, string> = {
    0: 'T', 1: 'b2', 2: '2M', 3: '3m', 4: '3M', 5: '4J', 6: '#4/b5', 7: '5J', 8: 'b6', 9: '6M', 10: '7m', 11: '7M'
};

export const getNoteIndex = (note: NoteName): number => NOTES.indexOf(note);

export const getNoteFromInterval = (root: NoteName, semitones: number): NoteName => {
  const rootIdx = getNoteIndex(root);
  return NOTES[(rootIdx + semitones) % 12];
};

export const getChordTones = (chord: Chord): NoteName[] => {
  const intervals = CHORD_INTERVALS[chord.quality];
  return intervals.map(i => getNoteFromInterval(chord.root, i));
};

export const getScaleNotes = (root: NoteName, scaleType: ScaleType): NoteName[] => {
    return SCALES[scaleType].map(interval => getNoteFromInterval(root, interval));
};

// --- Fretboard Mapping for 7-String ---

interface FretPosition {
  string: number; // 1-7
  fret: number;
  note: NoteName;
  octave: number;
}

// Base frequencies for string calculation
// Standard 7 String: E4, B3, G3, D3, A2, E2, B1
const STRING_OPEN_NOTES: { note: NoteName, octave: number }[] = [
  { note: 'E', octave: 4 }, // 1 (High E - Mizinha)
  { note: 'B', octave: 3 }, // 2 (Si)
  { note: 'G', octave: 3 }, // 3 (Sol)
  { note: 'D', octave: 3 }, // 4 (Re)
  { note: 'A', octave: 2 }, // 5 (La)
  { note: 'E', octave: 2 }, // 6 (Mi)
  { note: 'B', octave: 1 }, // 7 (Default)
];

export const findFretPosition = (
  targetNote: NoteName, 
  targetOctave: number, 
  tuning: SeventhStringTuning, 
  prevFret?: number,
  prevString?: number
): FretPosition | null => {
  
  // Adjust 7th string based on tuning
  const currentStringNotes = [...STRING_OPEN_NOTES];
  if (tuning.includes('C')) {
    currentStringNotes[6] = { note: 'C', octave: 2 };
  } else if (tuning.includes('A')) {
    currentStringNotes[6] = { note: 'A', octave: 1 };
  } else {
    currentStringNotes[6] = { note: 'B', octave: 1 };
  }
  
  const possiblePositions: FretPosition[] = [];

  for (let s = 0; s < 7; s++) { // 0 to 6 (representing strings 1 to 7)
    const open = currentStringNotes[s];
    const openNoteIdx = getNoteIndex(open.note);
    // Base MIDI number approx calculation for comparison
    const openMidi = openNoteIdx + (open.octave + 1) * 12;
    
    const targetNoteIdx = getNoteIndex(targetNote);
    const targetMidi = targetNoteIdx + (targetOctave + 1) * 12;

    const diff = targetMidi - openMidi;
    
    // STRICT CONSTRAINT: First 5 frets ONLY.
    if (diff >= 0 && diff <= 5) { 
      possiblePositions.push({
        string: s + 1, // 1-based index
        fret: diff,
        note: targetNote,
        octave: targetOctave
      });
    }
  }

  if (possiblePositions.length === 0) return null;

  // Sorting Logic:
  // 1. **FRETTED NOTES PRIORITY**: User request "Diminuir frases com cordas soltas".
  // If one is fret 0 and other is fretted, prefer fretted.
  
  possiblePositions.sort((a, b) => {
      // 1. Avoid Open Strings (Reverse Logic)
      if (a.fret === 0 && b.fret !== 0) return 1; // Penalty for A (open)
      if (b.fret === 0 && a.fret !== 0) return -1; // Penalty for B (open)

      // 2. Contextual Positioning (if prev note provided)
      if (prevFret !== undefined && prevString !== undefined) {
          const distA = Math.abs(a.fret - prevFret) + Math.abs(a.string - prevString);
          const distB = Math.abs(b.fret - prevFret) + Math.abs(b.string - prevString);
          return distA - distB;
      }

      // 3. Register Preference
      // If note is high (Octave 3 or 4), we want strings 1, 2, 3.
      if (targetOctave >= 3) {
          return a.string - b.string; // Prefer smaller string index (1, 2, 3)
      } else {
          return b.string - a.string; // Prefer thicker strings for bass
      }
  });
  
  return possiblePositions[0];
};

export const getFrequency = (note: NoteName, octave: number): number => {
    const noteIdx = getNoteIndex(note);
    const midi = (octave + 1) * 12 + noteIdx;
    const A4Midi = 69;
    return 440 * Math.pow(2, (midi - A4Midi) / 12);
};
