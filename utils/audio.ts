import { InstrumentType } from '../types';

// Simple audio context singleton to avoid recreating it
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    masterGain.gain.value = 0.8; // Default volume
  }
  return audioCtx;
};

export const setMasterVolume = (val: number) => {
  if (masterGain) {
    // Smooth transition to avoid clicks
    masterGain.gain.setTargetAtTime(val, getAudioContext().currentTime, 0.02);
  }
};

export const playTone = (frequency: number, type: OscillatorType = 'triangle', duration = 2.0) => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Envelope
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); // Attack
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Decay

  osc.connect(gain);
  // Bypass master gain for tuner tones if desired, or connect to masterGain logic
  gain.connect(ctx.destination); 

  osc.start();
  osc.stop(ctx.currentTime + duration);
};

// Precise scheduled click for Metronome
export const scheduleClick = (time: number, type: 'accent' | 'sub' | 'normal') => {
  const ctx = getAudioContext();
  if (!masterGain) getAudioContext(); // Ensure init

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // GUITAR OPTIMIZED FREQUENCIES
  let freq = 1200;
  let vol = 1.0;

  if (type === 'accent') {
    freq = 2000;
    vol = 1.0;
  } else if (type === 'sub') {
    freq = 800;
    vol = 0.4; 
  } else {
    freq = 1200;
    vol = 0.7;
  }

  osc.type = 'triangle'; 
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.001); 
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.connect(gain);
  if (masterGain) {
      gain.connect(masterGain);
  } else {
      gain.connect(ctx.destination);
  }

  osc.start(time);
  osc.stop(time + 0.06);
};

export const playClick = (accent: boolean) => {
    scheduleClick(getAudioContext().currentTime, accent ? 'accent' : 'normal');
};

/**
 * Advanced Oscillator Synthesis for Instruments
 * Simulates timbre by mixing oscillators and applying specific ADSR envelopes
 */
export const playInstrumentNote = (frequency: number, instrument: InstrumentType = 'nylon', duration = 1.0) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const t = ctx.currentTime;
    const dest = masterGain || ctx.destination;

    // --- STRINGS & KEYS FAMILY (Plucked/Struck) ---
    if (instrument === 'nylon' || instrument === 'steel' || instrument === 'piano' || instrument === 'cavaco' || instrument === 'bass') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator(); // Body/Harmonic
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        gain.connect(dest);
        filter.connect(gain);
        osc1.connect(filter);
        
        let attackTime = 0.02;
        let decayTime = duration;

        if (instrument === 'nylon') {
            osc1.type = 'triangle';
            osc2.type = 'sawtooth';
            // Soft filter
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(frequency * 3, t);
            filter.frequency.exponentialRampToValueAtTime(frequency, t + 0.3);
            
            // Mix osc2 lower for nylon warmth
            const osc2Gain = ctx.createGain();
            osc2Gain.gain.value = 0.4; // Sawtooth lower mix
            osc2.connect(osc2Gain);
            osc2Gain.connect(filter);

        } else {
            // Standard connection for others
            osc2.connect(filter);

            if (instrument === 'steel') {
                osc1.type = 'sawtooth'; // Bright
                osc2.type = 'triangle';
                attackTime = 0.01; // Sharper attack
                filter.type = 'highpass'; // Thin out the lows slightly for steel zing
                filter.frequency.setValueAtTime(200, t);
                
            } else if (instrument === 'cavaco') {
                 osc1.type = 'sawtooth';
                 osc2.type = 'square';
                 // Cavaco is piercing
                 decayTime = duration * 0.4; // Short sustain
                 filter.type = 'bandpass';
                 filter.frequency.setValueAtTime(frequency * 2, t);
                 
            } else if (instrument === 'piano') {
                 osc1.type = 'triangle';
                 osc2.type = 'sine';
                 attackTime = 0.015;
                 decayTime = duration * 1.5;
                 filter.type = 'lowpass';
                 filter.frequency.setValueAtTime(frequency * 6, t);
                 filter.frequency.exponentialRampToValueAtTime(frequency, t + 0.5);

            } else if (instrument === 'bass') {
                 osc1.type = 'triangle';
                 osc2.type = 'sine'; // Sub
                 osc2.frequency.setValueAtTime(frequency / 2, t);
                 filter.type = 'lowpass';
                 filter.frequency.setValueAtTime(600, t);
            }
        }

        osc1.frequency.setValueAtTime(frequency, t);
        if (instrument !== 'bass') osc2.frequency.setValueAtTime(frequency, t);

        // Envelope
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5, t + attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, t + decayTime);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + decayTime + 0.1);
        osc2.stop(t + decayTime + 0.1);
    } 
    
    // --- KEYBOARD (Sustained/Modulated) ---
    else if (instrument === 'keyboard') {
        // Rhodes-ish: Sine with Tremolo
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, t);

        const tremolo = ctx.createOscillator();
        tremolo.frequency.value = 6; // Hz
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.2;
        tremolo.connect(tremoloGain);
        
        const mainGain = ctx.createGain();
        tremoloGain.connect(mainGain.gain);
        
        osc.connect(mainGain);
        mainGain.connect(dest);

        // Envelope
        mainGain.gain.setValueAtTime(0, t);
        mainGain.gain.linearRampToValueAtTime(0.4, t + 0.05);
        mainGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        osc.start(t);
        tremolo.start(t);
        osc.stop(t + duration);
        tremolo.stop(t + duration);
    }

    // --- WINDS (Sustained, Breath, Swell) ---
    else {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.frequency.setValueAtTime(frequency, t);
        
        let attack = 0.1;
        let sustain = 0.4;
        let vibratoAmount = 0;

        if (instrument === 'sax') {
            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(frequency * 3, t); // Bright
            attack = 0.08;
            vibratoAmount = 5;

        } else if (instrument === 'clarinet') {
            osc.type = 'square'; // Woody odd harmonics
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(frequency * 2, t);
            attack = 0.12; // Softer
            vibratoAmount = 2;

        } else if (instrument === 'flute') {
            osc.type = 'sine'; // Pure
            // Add slight noise for breath? (Simplified: just sine here)
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(frequency * 1.5, t);
            attack = 0.15;
            vibratoAmount = 6;

        } else if (instrument === 'trumpet') {
             osc.type = 'sawtooth';
             filter.type = 'lowpass';
             filter.frequency.setValueAtTime(frequency * 5, t); // Very bright
             attack = 0.04; // Sharp
             vibratoAmount = 3;

        } else if (instrument === 'trombone') {
             osc.type = 'sawtooth';
             filter.type = 'lowpass';
             filter.frequency.setValueAtTime(100, t); // Starts muffled
             filter.frequency.linearRampToValueAtTime(frequency * 4, t + 0.2); // Swell
             attack = 0.15;

        } else if (instrument === 'harmonica') {
             osc.type = 'sawtooth';
             // Harmonica often has a slight detune beating, simulated here simpler
             filter.type = 'bandpass';
             filter.Q.value = 1;
             filter.frequency.setValueAtTime(frequency * 2, t);
             attack = 0.05;
             vibratoAmount = 10; // Hand wah simulation via vibrato
        }

        // Vibrato Logic
        if (vibratoAmount > 0) {
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 5; // Rate
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = vibratoAmount;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(t);
            lfo.stop(t + duration);
        }

        // ADSR
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(sustain, t + attack);
        gain.gain.setValueAtTime(sustain, t + duration - 0.1); // Hold
        gain.gain.linearRampToValueAtTime(0, t + duration); // Release

        osc.start(t);
        osc.stop(t + duration);
    }
};

export const playSuccessSound = (frequency: number) => {
  // Backward compatibility wrapper (Default to Nylon)
  playInstrumentNote(frequency, 'nylon');
};

export const preloadGuitarSounds = (notes: {note: string, octave: number}[]) => {
  // No-op for synthesis
};

export const playGuitarSample = (frequency: number) => {
  playSuccessSound(frequency);
};
