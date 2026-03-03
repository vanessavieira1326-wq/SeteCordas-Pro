import { SeventhStringTuning } from '../types';

export interface HarmonicStudy {
  id: string;
  title: string;
  description: string;
  progression: string;
  bassLine: string;
  explanation: string;
  rhythmSuggestion: string;
  rightHandTechnique: string;
  tuningTips: {
    [key in SeventhStringTuning]?: string;
  };
  bassSequence: {
    [key in SeventhStringTuning]: { note: string, octave: number }[];
  };
}

export const HARMONIC_STUDIES: HarmonicStudy[] = [
  {
    id: 'cycle-5',
    title: '1. Ciclo das Quintas (Baixo Descendente)',
    description: 'Estudo de condução de baixo em Dó Maior utilizando inversões para criar uma linha descendente fluida.',
    progression: 'C  →  G/B  →  Am  →  E/G#  →  F  →  D/F#  →  G  →  C',
    bassLine: 'C  →  B  →  A  →  G#  →  F  →  F#  →  G  →  C',
    explanation: 'Este ciclo utiliza inversões (terças no baixo) para evitar saltos grandes e criar uma melodia no baixo (counterpoint). O movimento C -> B -> A cria uma linha suave, típica de compositores como Pixinguinha.',
    rhythmSuggestion: 'Samba ou Choro lento. Dê ênfase ao tempo 1 (baixo) e antecipe os acordes quando possível.',
    rightHandTechnique: 'Polegar (P) firme na 7ª e 6ª cordas. Indicador (I), Médio (M) e Anelar (A) puxam o acorde simultaneamente.',
    tuningTips: {
      [SeventhStringTuning.C]: 'Aproveite a corda C solta para o final. O G# (E/G#) pode ser feito na corda 6 (casa 4) ou corda 7 (casa 8).',
      [SeventhStringTuning.B]: 'O C inicial deve ser na corda 5 (casa 3). O B (G/B) fica excelente na corda 7 solta.',
      [SeventhStringTuning.A]: 'O A (Am) pode ser usado na corda 7 solta, dando um peso enorme à harmonia.',
    },
    bassSequence: {
      [SeventhStringTuning.C]: [
        { note: 'C', octave: 3 }, { note: 'B', octave: 2 }, { note: 'A', octave: 2 }, { note: 'G#', octave: 2 },
        { note: 'F', octave: 2 }, { note: 'F#', octave: 2 }, { note: 'G', octave: 2 }, { note: 'C', octave: 2 }
      ],
      [SeventhStringTuning.B]: [
        { note: 'C', octave: 3 }, { note: 'B', octave: 1 }, { note: 'A', octave: 2 }, { note: 'G#', octave: 2 },
        { note: 'F', octave: 2 }, { note: 'F#', octave: 2 }, { note: 'G', octave: 2 }, { note: 'C', octave: 3 }
      ],
      [SeventhStringTuning.A]: [
        { note: 'C', octave: 3 }, { note: 'B', octave: 2 }, { note: 'A', octave: 1 }, { note: 'G#', octave: 2 },
        { note: 'F', octave: 2 }, { note: 'F#', octave: 2 }, { note: 'G', octave: 2 }, { note: 'C', octave: 3 }
      ]
    }
  },
  {
    id: 'cycle-4',
    title: '2. Ciclo das Quartas (Regional)',
    description: 'Aplicação prática do ciclo de quartas com preparação dominante, muito comum em choros.',
    progression: 'C  →  F  →  Bm7(b5)  →  E7  →  Am  →  D7  →  G7  →  C',
    bassLine: 'C → F → B → E → A → D → G → C (Alternando fundamentais)',
    explanation: 'Cada acorde prepara o próximo como se fosse um dominante ou grau relativo. O movimento de quartas é a base da harmonia funcional.',
    rhythmSuggestion: 'Maxixe ou Choro rápido. Baixo alternado (Fundamental - Quinta) funciona muito bem aqui.',
    rightHandTechnique: 'Alterne o polegar entre os baixos. Use arpejos rápidos (P-I-M-A) nas transições.',
    tuningTips: {
      [SeventhStringTuning.C]: 'O C grave solta é a base. O F pode ser feito na corda 6 (casa 1) ou corda 5 (casa 8).',
      [SeventhStringTuning.B]: 'Cuidado com o Bm7(b5), use a 7ª corda solta (B) para facilitar a digitação.',
      [SeventhStringTuning.A]: 'O A grave solta para o Am é o ponto alto deste ciclo.',
    },
    bassSequence: {
      [SeventhStringTuning.C]: [
        { note: 'C', octave: 2 }, { note: 'F', octave: 2 }, { note: 'B', octave: 2 }, { note: 'E', octave: 2 },
        { note: 'A', octave: 2 }, { note: 'D', octave: 3 }, { note: 'G', octave: 2 }, { note: 'C', octave: 3 }
      ],
      [SeventhStringTuning.B]: [
        { note: 'C', octave: 3 }, { note: 'F', octave: 2 }, { note: 'B', octave: 1 }, { note: 'E', octave: 2 },
        { note: 'A', octave: 2 }, { note: 'D', octave: 3 }, { note: 'G', octave: 2 }, { note: 'C', octave: 3 }
      ],
      [SeventhStringTuning.A]: [
        { note: 'C', octave: 3 }, { note: 'F', octave: 2 }, { note: 'B', octave: 2 }, { note: 'E', octave: 2 },
        { note: 'A', octave: 1 }, { note: 'D', octave: 3 }, { note: 'G', octave: 2 }, { note: 'C', octave: 3 }
      ]
    }
  },
  {
    id: 'ii-v-i',
    title: '3. II - V - I (Walking Bass)',
    description: 'A cadência mais importante do jazz e bossa nova, com um baixo caminhante (walking bass).',
    progression: 'Dm7  →  G7  →  C7M',
    bassLine: 'D  →  F  →  G  →  B  →  C',
    explanation: 'O baixo não toca apenas a fundamental. Ele "caminha" pelas notas do acorde e aproximações cromáticas (F para G, B para C) para gerar movimento.',
    rhythmSuggestion: 'Bossa Nova ou Samba-Jazz. Swingue as colcheias.',
    rightHandTechnique: 'Levada de Bossa: Polegar marca o tempo, dedos fazem o balanço sincopado.',
    tuningTips: {
      [SeventhStringTuning.C]: 'Use o C grave na resolução final (C7M).',
      [SeventhStringTuning.B]: 'O Dm7 pode ter o baixo em D (corda 4 solta) ou D (corda 6 casa 10/corda 5 casa 5).',
      [SeventhStringTuning.A]: 'Experimente o G7 com baixo em G na corda 7 (casa 10) se quiser um som bem profundo, ou G normal.',
    },
    bassSequence: {
      [SeventhStringTuning.C]: [
        { note: 'D', octave: 3 }, { note: 'F', octave: 2 }, { note: 'G', octave: 2 }, { note: 'B', octave: 2 }, { note: 'C', octave: 2 }
      ],
      [SeventhStringTuning.B]: [
        { note: 'D', octave: 3 }, { note: 'F', octave: 2 }, { note: 'G', octave: 2 }, { note: 'B', octave: 1 }, { note: 'C', octave: 3 }
      ],
      [SeventhStringTuning.A]: [
        { note: 'D', octave: 3 }, { note: 'F', octave: 2 }, { note: 'G', octave: 2 }, { note: 'B', octave: 2 }, { note: 'C', octave: 3 }
      ]
    }
  },
  {
    id: 'blues-br',
    title: '4. Ciclo de Blues Brasileiro',
    description: 'Estrutura de Blues (12 compassos) com uma roupagem brasileira e baixaria ativa.',
    progression: 'A7 (4 comp) → D7 (2 comp) → A7 (2 comp) → E7 (1 comp) → D7 (1 comp) → A7 (2 comp)',
    bassLine: 'A → C# → D → F → E → G → A (Linha melódica sugerida)',
    explanation: 'Ao invés do shuffle tradicional, usamos uma linha de baixo que desenha as terças (A -> C#) e sétimas, aproximando-se da linguagem do choro.',
    rhythmSuggestion: 'Samba-Rock ou Baião lento.',
    rightHandTechnique: 'Polegar muito ativo, funcionando quase como um instrumento solo.',
    tuningTips: {
      [SeventhStringTuning.C]: 'O A7 soa bem com baixo na corda 5 solta. O E7 pode usar o E grave (corda 6).',
      [SeventhStringTuning.B]: 'O A pode ser tocado na corda 7 (casa 10) para um timbre diferente, mas a corda 5 solta é padrão.',
      [SeventhStringTuning.A]: 'Perfeito para afinação em A. Use a 7ª corda solta para o A7. O som é encorpado e poderoso.',
    },
    bassSequence: {
      [SeventhStringTuning.C]: [
        { note: 'A', octave: 2 }, { note: 'C#', octave: 3 }, { note: 'D', octave: 3 }, { note: 'F', octave: 3 },
        { note: 'E', octave: 3 }, { note: 'G', octave: 2 }, { note: 'A', octave: 2 }
      ],
      [SeventhStringTuning.B]: [
        { note: 'A', octave: 2 }, { note: 'C#', octave: 3 }, { note: 'D', octave: 3 }, { note: 'F', octave: 3 },
        { note: 'E', octave: 3 }, { note: 'G', octave: 2 }, { note: 'A', octave: 2 }
      ],
      [SeventhStringTuning.A]: [
        { note: 'A', octave: 1 }, { note: 'C#', octave: 2 }, { note: 'D', octave: 2 }, { note: 'F', octave: 2 },
        { note: 'E', octave: 2 }, { note: 'G', octave: 2 }, { note: 'A', octave: 1 }
      ]
    }
  },
  {
    id: 'choro-trad',
    title: '5. Ciclo Tradicional de Choro',
    description: 'A "baixaria" clássica de choro em tonalidade menor, com linha descendente cromática.',
    progression: 'Dm  →  Dm/C  →  Bm7(b5)  →  Bb7  →  A7',
    bassLine: 'D  →  C  →  B  →  Bb  →  A',
    explanation: 'O famoso "Clichê de Linha". O baixo desce cromaticamente da tônica até a dominante (A7). É a assinatura do choro lamento.',
    rhythmSuggestion: 'Choro Lento ou Seresta. Muito expressivo e rubato (tempo livre) se desejar.',
    rightHandTechnique: 'Toque apoiado (rest stroke) com o polegar para destacar a melodia do baixo.',
    tuningTips: {
      [SeventhStringTuning.C]: 'O C natural (Dm/C) brilha na 7ª corda solta.',
      [SeventhStringTuning.B]: 'O B (Bm7b5) na 7ª corda solta facilita muito esta passagem difícil.',
      [SeventhStringTuning.A]: 'O A final (A7) na 7ª corda solta resolve a tensão com gravidade máxima.',
    },
    bassSequence: {
      [SeventhStringTuning.C]: [
        { note: 'D', octave: 3 }, { note: 'C', octave: 2 }, { note: 'B', octave: 2 }, { note: 'A#', octave: 2 }, { note: 'A', octave: 2 }
      ],
      [SeventhStringTuning.B]: [
        { note: 'D', octave: 3 }, { note: 'C', octave: 3 }, { note: 'B', octave: 1 }, { note: 'A#', octave: 2 }, { note: 'A', octave: 2 }
      ],
      [SeventhStringTuning.A]: [
        { note: 'D', octave: 3 }, { note: 'C', octave: 3 }, { note: 'B', octave: 2 }, { note: 'A#', octave: 2 }, { note: 'A', octave: 1 }
      ]
    }
  }
];
