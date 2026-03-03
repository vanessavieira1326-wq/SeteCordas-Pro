
import { BassNote, Chord, NoteName, RhythmStyle, SeventhStringTuning, ChordQuality, NoteDensity, Tonality } from '../types';
import { NOTES, getChordTones, findFretPosition, getNoteIndex, getScaleNotes, getNoteFromInterval, ScaleType } from '../utils/musicTheory';

// --- HELPERS ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- PROGRESSION GENERATOR ---
const PROGRESSION_POOLS = {
  'Iniciante': {
    'Major': {
        'Samba': [
            // I - V7 - I
            [{ r: 0, q: '6' }, { r: 7, q: '7' }, { r: 0, q: '6' }, { r: 7, q: '7' }], 
            // I - VI7 - II7 - V7 (Circle)
            [{ r: 0, q: '6' }, { r: 9, q: '7' }, { r: 2, q: '7' }, { r: 7, q: '7' }],
        ],
        'Choro': [
             // Choro Major
            [{ r: 0, q: '6' }, { r: 7, q: '7' }, { r: 0, q: '6' }, { r: 7, q: '7' }], 
            [{ r: 0, q: 'maj7' }, { r: 5, q: 'm6' }, { r: 0, q: 'maj7' }, { r: 7, q: '7' }]
        ]
    },
    'Minor': {
        'Samba': [
            // im - V7 - im
            [{ r: 0, q: 'm6' }, { r: 7, q: '7' }, { r: 0, q: 'm6' }, { r: 7, q: '7' }],
            // im - iv - V7
            [{ r: 0, q: 'm7' }, { r: 5, q: 'm7' }, { r: 7, q: '7' }, { r: 0, q: 'm6' }]
        ],
        'Choro': [
            // Minor Choro (Focus on m6 for the scale study)
            [{ r: 0, q: 'm6' }, { r: 7, q: '7' }, { r: 0, q: 'm6' }, { r: 7, q: '7' }], 
            [{ r: 0, q: 'm6' }, { r: 5, q: 'm6' }, { r: 7, q: '7' }, { r: 0, q: 'm6' }]
        ]
    }
  },
  'Intermediário': {
    'Major': {
        'Samba': [
            // Major 2-5-1
            [{ r: 0, q: 'maj7' }, { r: 2, q: 'm7' }, { r: 7, q: '7' }, { r: 0, q: '6' }],
            // Deceptive Resolution I - V/vi - vi - V7
            [{ r: 0, q: 'maj7' }, { r: 8, q: '7' }, { r: 9, q: 'm7' }, { r: 7, q: '7' }], 
        ],
        'Choro': [
            // Modulation Prep
            [{ r: 0, q: 'maj7' }, { r: 5, q: 'm6' }, { r: 0, q: 'maj7' }, { r: 7, q: '7' }],
            // Descending Bass
            [{ r: 0, q: 'maj7' }, { r: 11, q: 'm7b5' }, { r: 9, q: 'm7' }, { r: 7, q: '7' }]
        ]
    },
    'Minor': {
        'Samba': [
             // Minor 2-5-1
            [{ r: 0, q: 'm7' }, { r: 2, q: 'm7b5' }, { r: 7, q: '7' }, { r: 0, q: 'm6' }],
            // Chromatic: im - bVI - V7
            [{ r: 0, q: 'm7' }, { r: 8, q: 'maj7' }, { r: 7, q: '7' }, { r: 0, q: 'm7' }]
        ],
        'Choro': [
            // Typical Choro Descending
            [{ r: 0, q: 'm7' }, { r: 0, q: '7' }, { r: 5, q: 'm7' }, { r: 8, q: '7' }, { r: 7, q: '7' }],
        ]
    }
  },
  'Avançado': {
    'Major': {
        'Samba': [
            // Chromatic approach & Diminished
            [{ r: 0, q: 'maj7' }, { r: 3, q: 'dim7' }, { r: 2, q: 'm7' }, { r: 1, q: '7' }, { r: 0, q: '6' }],
            // Extended Turnaround
            [{ r: 0, q: '6' }, { r: 11, q: 'm7b5' }, { r: 4, q: '7' }, { r: 9, q: 'm7' }, { r: 2, q: '7' }, { r: 7, q: '7' }]
        ],
        'Choro': [
            // Circle of Fifths
             [{ r: 0, q: '6' }, { r: 4, q: '7' }, { r: 9, q: '7' }, { r: 2, q: '7' }, { r: 7, q: '7' }, { r: 0, q: '6' }]
        ]
    },
    'Minor': {
        'Samba': [
             // Line Cliché
            [{ r: 0, q: 'm' }, { r: 0, q: 'm7' }, { r: 0, q: 'm6' }, { r: 8, q: 'maj7' }, { r: 7, q: '7' }],
        ],
        'Choro': [
            // Diminished Run
            [{ r: 0, q: '6' }, { r: 1, q: 'dim7' }, { r: 2, q: 'm7' }, { r: 3, q: 'dim7' }, { r: 4, q: 'm7' }, { r: 7, q: '7' }],
            // Circle of Fifths Minor
            [{ r: 0, q: 'm6' }, { r: 7, q: '7' }, { r: 4, q: '7' }, { r: 9, q: '7' }, { r: 2, q: '7' }, { r: 7, q: '7' }]
        ]
    }
  }
};

export const generateProgression = (key: NoteName, tonality: Tonality, level: string): Chord[] => {
  const progression: Chord[] = [];
  const keyIdx = getNoteIndex(key);
  const getRelNote = (semitones: number) => NOTES[(keyIdx + semitones) % 12];

  const lvlKey = level as keyof typeof PROGRESSION_POOLS;
  // @ts-ignore
  const tonalityPool = PROGRESSION_POOLS[lvlKey][tonality];
  const styles = Object.keys(tonalityPool);
  const randomStyle = getRandomElement(styles);
  
  // @ts-ignore
  const pool = tonalityPool[randomStyle] as any[];
  const choice = getRandomElement(pool) as any[];

  choice.forEach((c: any) => {
      progression.push({ 
          root: getRelNote(c.r), 
          quality: c.q as any, 
          display: `${getRelNote(c.r)}${c.q}`, 
          duration: level === 'Iniciante' ? 4 : 2 
      });
  });

  return progression;
};

// --- BASS LINE STRATEGIES ---

type Strategy = 
  | 'ROOT_FIFTH' 
  | 'ALTERNATING_RANGE' 
  | 'ASCENDING_RUN' 
  | 'DESCENDING_RESOLUTION' 
  | 'ARPEGGIO_COUNT' 
  | 'CHROMATIC_ENCLOSURE' 
  | 'OCTAVE_JUMP' 
  | 'MELODIC_MINOR_SCALE'
  | 'MAJOR_SCALE_PATTERN'
  | 'MIXOLYDIAN_SCALE_PATTERN';

export const generateBassLine = (
  progression: Chord[],
  style: RhythmStyle,
  level: 'Iniciante' | 'Intermediário' | 'Avançado',
  tuning: SeventhStringTuning,
  key: NoteName,
  density: NoteDensity | 'scale'
): BassNote[] => {
  const notes: BassNote[] = [];
  let currentBeatOffset = 0;
  
  let LOW_LIMIT = 35; // B1 (String 7)
  if (tuning.includes('C')) LOW_LIMIT = 36; // C2
  if (tuning.includes('A')) LOW_LIMIT = 33; // A1
  
  const BASS_CEILING = 48; // D3
  const TREBLE_CEILING = 71; // B4

  progression.forEach((chord, index) => {
    const nextChord = progression[(index + 1) % progression.length];
    const beatsInChord = chord.duration;
    
    const q = chord.quality;
    const chordTones = getChordTones(chord);
    
    // Scale Logic for Strategy Selection
    let scaleType: ScaleType = 'Major';
    if (q.includes('m7b5')) scaleType = 'Locrian';
    else if (q.includes('dim')) scaleType = 'Harmonic Minor';
    else if (q.includes('m')) scaleType = 'Minor';
    else if (q === '7') scaleType = 'Mixolydian';

    const scaleNotes = getScaleNotes(chord.root, scaleType);

    // --- STRATEGY SELECTION ---
    let strategy: Strategy = 'ROOT_FIFTH';
    
    if (density === 'scale') {
         // User explicitly requested "Escala (Modelo Partitura)"
         // Apply appropriate scale pattern based on chord quality
         if (q.includes('m')) strategy = 'MELODIC_MINOR_SCALE';
         else if (q === '7') strategy = 'MIXOLYDIAN_SCALE_PATTERN';
         else strategy = 'MAJOR_SCALE_PATTERN';
    } else if (density !== 'auto') {
        strategy = 'ARPEGGIO_COUNT';
    } else {
        if (level === 'Iniciante') {
            strategy = 'ROOT_FIFTH';
        } else {
            const rand = Math.random();
            // Higher probability of Scale runs in Choro/Minor to mimic the score
            if (q.includes('m') && (q === 'm6' || q === 'm') && rand < 0.6) {
                strategy = 'MELODIC_MINOR_SCALE';
            } else if (style === RhythmStyle.CHORO) {
                if (rand < 0.25) strategy = 'ASCENDING_RUN';
                else if (rand < 0.5) strategy = 'DESCENDING_RESOLUTION';
                else if (rand < 0.75) strategy = 'CHROMATIC_ENCLOSURE';
                else strategy = 'ALTERNATING_RANGE';
            } else {
                if (rand < 0.3) strategy = 'ALTERNATING_RANGE';
                else if (rand < 0.6) strategy = 'OCTAVE_JUMP';
                else if (rand < 0.8) strategy = 'CHROMATIC_ENCLOSURE';
                else strategy = 'ROOT_FIFTH';
            }
        }
    }

    // --- FIND ROOT ---
    let rootMidi = -1;
    [1, 2].forEach(oct => {
        const m = getNoteIndex(chord.root) + (oct + 1) * 12;
        if (m >= LOW_LIMIT && m <= BASS_CEILING) rootMidi = m;
    });
    if (rootMidi === -1) rootMidi = getNoteIndex(chord.root) + (3) * 12;

    // --- EXECUTE STRATEGY ---

    if (strategy === 'MELODIC_MINOR_SCALE' || strategy === 'MAJOR_SCALE_PATTERN' || strategy === 'MIXOLYDIAN_SCALE_PATTERN') {
        // SCALES PATTERNS (Ascending / Descending)
        
        let asc: number[] = [];
        let desc: number[] = [];
        let triadIntervals: number[] = [0, 4, 7, 12];

        if (strategy === 'MELODIC_MINOR_SCALE') {
            // Melodic Minor Up: 1 2 b3 4 5 6 7 8
            asc = [0, 2, 3, 5, 7, 9, 11, 12];
            // Natural Minor Down: b7 b6 5 4 b3 2 1
            desc = [10, 8, 7, 5, 3, 2, 0];
            triadIntervals = [0, 3, 7, 12];
        } else if (strategy === 'MIXOLYDIAN_SCALE_PATTERN') {
            // Mixolydian Up: 1 2 3 4 5 6 b7 8
            asc = [0, 2, 4, 5, 7, 9, 10, 12];
            // Mixolydian Down: b7 6 5 4 3 2 1
            desc = [10, 9, 7, 5, 4, 2, 0];
            triadIntervals = [0, 4, 7, 10, 12];
        } else {
            // Major Up: 1 2 3 4 5 6 7 8
            asc = [0, 2, 4, 5, 7, 9, 11, 12];
            // Major Down: 7 6 5 4 3 2 1
            desc = [11, 9, 7, 5, 4, 2, 0];
        }
        
        const noteDuration = 0.25; // 16th notes
        const totalNotes = Math.floor(beatsInChord / noteDuration);
        
        let sequence: number[] = [];
        
        // Logic: if bar is long enough, go up and down. If short, just up or adapt.
        if (totalNotes >= 15) {
             sequence = [...asc, ...desc];
             if (sequence.length > totalNotes) sequence = sequence.slice(0, totalNotes);
        } else {
             sequence = asc;
             if (sequence.length > totalNotes) sequence = sequence.slice(0, totalNotes);
        }

        sequence.forEach((interval, i) => {
            const noteMidi = rootMidi + interval;
            if (noteMidi <= TREBLE_CEILING + 5) {
                 const n = midiToNote(noteMidi);
                 const p = findFretPosition(n.note, n.octave, tuning);
                 if (p) {
                     notes.push({
                         ...p,
                         duration: noteDuration,
                         startTime: currentBeatOffset + (i * noteDuration),
                         isChordTone: triadIntervals.includes(interval % 12),
                         isChromatic: false
                     });
                 }
            }
        });
    }

    else if (strategy === 'ARPEGGIO_COUNT' && typeof density === 'number') {
        const count = density;
        const durationPerNote = beatsInChord / count;
        let currentNoteMidi = rootMidi;
        
        for (let i = 0; i < count; i++) {
            let targetMidi = currentNoteMidi;
            if (i === 0) targetMidi = rootMidi;
            else if (i === count - 1) targetMidi = rootMidi;
            else {
                const validTones: number[] = [];
                [2, 3, 4].forEach(oct => {
                    chordTones.forEach(t => {
                        const m = getNoteIndex(t) + (oct + 1) * 12;
                        if (m >= LOW_LIMIT && m <= TREBLE_CEILING && m !== currentNoteMidi) {
                            validTones.push(m);
                        }
                    });
                });
                
                const higher = validTones.filter(n => n > currentNoteMidi).sort((a,b) => a-b);
                const lower = validTones.filter(n => n < currentNoteMidi).sort((a,b) => b-a);
                
                if (i < count / 2 && higher.length > 0) targetMidi = higher[Math.min(higher.length - 1, getRandomInt(0, 1))];
                else if (lower.length > 0) targetMidi = lower[0];
                else targetMidi = getRandomElement(validTones) || rootMidi;
            }
            if (!targetMidi) targetMidi = rootMidi;
            currentNoteMidi = targetMidi;
            
            const n = midiToNote(targetMidi);
            const p = findFretPosition(n.note, n.octave, tuning);
            if (p) notes.push({ ...p, duration: durationPerNote, startTime: currentBeatOffset + (i * durationPerNote), isChordTone: true });
        }
    }
    else {
        // Always Start with Root
        const rootPos = findFretPosition(chord.root, Math.floor(rootMidi/12)-1, tuning);
        if (rootPos) {
            notes.push({ ...rootPos, duration: 0.5, startTime: currentBeatOffset, isChordTone: true });
        }

        let currentMidi = rootMidi;

        if (strategy === 'ROOT_FIFTH') {
             const fifthNote = chordTones[2]; 
             let fifthMidi = getNoteIndex(fifthNote) + (Math.floor(rootMidi/12) + 1) * 12;
             if (fifthMidi > 55) fifthMidi -= 12;
             const pos = findFretPosition(fifthNote, Math.floor(fifthMidi/12)-1, tuning);
             if (pos) notes.push({ ...pos, duration: 0.5, startTime: currentBeatOffset + (beatsInChord/2), isChordTone: true });
        }
        else if (strategy === 'OCTAVE_JUMP') {
             // Pattern: Root (Low) -> Root (High) -> 7th/5th -> Root
             const highRoot = rootMidi + 12;
             if (highRoot <= TREBLE_CEILING) {
                 const n = midiToNote(highRoot);
                 const p = findFretPosition(n.note, n.octave, tuning);
                 if(p) notes.push({...p, duration: 0.5, startTime: currentBeatOffset + 0.5, isChordTone: true});
                 currentMidi = highRoot;
             }
             // Add rhythmic fill at end
             const startRun = beatsInChord - 1.0;
             const n = midiToNote(rootMidi);
             const p = findFretPosition(n.note, n.octave, tuning);
             if(p) notes.push({...p, duration: 0.5, startTime: currentBeatOffset + startRun + 0.5, isChordTone: true});
        }
        else if (strategy === 'CHROMATIC_ENCLOSURE') {
             const nextRootIdx = getNoteIndex(nextChord.root);
             let targetMidi = nextRootIdx + 36;
             if (targetMidi < LOW_LIMIT) targetMidi += 12;

             const above = targetMidi + 1;
             const below = targetMidi - 1;
             
             const startTime = currentBeatOffset + beatsInChord - 1.0;
             
             let n = midiToNote(above);
             let p = findFretPosition(n.note, n.octave, tuning);
             if(p) notes.push({...p, duration: 0.5, startTime: startTime, isChromatic: true});

             n = midiToNote(below);
             p = findFretPosition(n.note, n.octave, tuning);
             if(p) notes.push({...p, duration: 0.5, startTime: startTime + 0.5, isChromatic: true});
        }
        else if (strategy === 'ALTERNATING_RANGE') {
             const highTargets = chordTones.map(n => {
                 const oct3 = getNoteIndex(n) + 48;
                 const oct4 = getNoteIndex(n) + 60;
                 return [oct3, oct4];
             }).flat().filter(m => m >= 55 && m <= TREBLE_CEILING);

             const highTarget = highTargets.length > 0 ? highTargets[highTargets.length - 1] : rootMidi + 12;
             if (highTarget) {
                const n = midiToNote(highTarget);
                const p = findFretPosition(n.note, n.octave, tuning);
                if (p) notes.push({ ...p, duration: 0.5, startTime: currentBeatOffset + 1.5, isChordTone: true });
                currentMidi = highTarget;
             }
             const startRun = beatsInChord - 1.0;
             const n = midiToNote(rootMidi);
             const p = findFretPosition(n.note, n.octave, tuning);
             if(p) notes.push({...p, duration: 0.5, startTime: currentBeatOffset + startRun + 0.5, isChordTone: true});
        }
        else if (strategy === 'ASCENDING_RUN') {
             const tones = chordTones;
             const step = beatsInChord / 4; 
             let lastMidi = rootMidi;
             for(let i=1; i<4; i++) {
                 if (i===3) {
                     const n = midiToNote(rootMidi);
                     const p = findFretPosition(n.note, n.octave, tuning);
                     if(p) notes.push({...p, duration: step, startTime: currentBeatOffset + (i*step), isChordTone: true});
                     continue;
                 }
                 let nextToneMidi = lastMidi;
                 for (let k=1; k<16; k++) {
                     const check = lastMidi + k;
                     if (check > TREBLE_CEILING) break;
                     if (tones.includes(midiToNote(check).note)) {
                         nextToneMidi = check;
                         if (k > 4) break; 
                     }
                 }
                 lastMidi = nextToneMidi;
                 const n = midiToNote(lastMidi);
                 const p = findFretPosition(n.note, n.octave, tuning);
                 if(p) notes.push({...p, duration: step, startTime: currentBeatOffset + (i*step), isChordTone: true});
             }
        }
        else if (strategy === 'DESCENDING_RESOLUTION') {
             const highTargets = chordTones.map(n => getNoteIndex(n) + 60).filter(m => m >= 60 && m <= 71);
             const midTargets = chordTones.map(n => getNoteIndex(n) + 48).filter(m => m >= 55 && m < 64);
             let startNote = getRandomElement(highTargets) || getRandomElement(midTargets) || rootMidi + 12;

             const nStart = midiToNote(startNote);
             const pStart = findFretPosition(nStart.note, nStart.octave, tuning);
             
             if(pStart) {
                 notes.push({...pStart, duration: 0.5, startTime: currentBeatOffset + 1.0, isChordTone: true});
                 currentMidi = startNote;
             }
             
             const startRun = beatsInChord - 1.0;
             for(let i=0; i<4; i++) {
                 if (i===3) {
                     const n = midiToNote(rootMidi);
                     const p = findFretPosition(n.note, n.octave, tuning);
                     if(p) notes.push({...p, duration: 0.25, startTime: currentBeatOffset + startRun + 0.75, isChordTone: true});
                     continue;
                 }
                 let attempt = currentMidi - 1;
                 while(!scaleNotes.includes(midiToNote(attempt).note)) attempt--;
                 currentMidi = attempt;
                 const n = midiToNote(attempt);
                 const p = findFretPosition(n.note, n.octave, tuning);
                 if(p) notes.push({...p, duration: 0.25, startTime: currentBeatOffset + startRun + (i*0.25), isChromatic: true});
             }
        }
    }

    currentBeatOffset += beatsInChord;
  });

  return notes.sort((a, b) => a.startTime - b.startTime);
};

// Helper
const midiToNote = (midi: number): { note: NoteName, octave: number } => {
    const idx = midi % 12;
    const oct = Math.floor(midi / 12) - 1;
    return { note: NOTES[idx], octave: oct };
}
