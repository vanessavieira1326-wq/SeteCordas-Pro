
import { GoogleGenAI } from "@google/genai";
import { RhythmStyle, SeventhStringTuning, ChatMessage } from '../types';

export const sendCoachMessage = async (
  history: ChatMessage[],
  message: string,
  tuning: SeventhStringTuning,
  rhythm: RhythmStyle
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "Por favor, configure sua chave de API para conversar com o treinador.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `
      Você é um Assistente Musical Avançado, especializado em Violão de 7 Cordas e Música Brasileira (Samba, Choro, Bossa Nova).
      
      **Contexto do Aluno:**
      - Afinação da 7ª Corda: ${tuning} (Fundamental para a escolha das baixarias).
      - Ritmo/Estilo Atual: ${rhythm}.
      
      **Suas Responsabilidades:**
      1. **Técnica de Baixaria:** Explique como conectar acordes usando escalas (ex: Menor Melódica no Choro), arpejos e notas de passagem cromáticas.
      2. **Harmonia:** Analise progressões típicas (II-V-I, Circulo de Quintas) e sugira substituições harmônicas adequadas ao violão de 7 cordas.
      3. **Levada/Comping:** Dê dicas sobre a independência do polegar (baixos) em relação aos dedos (acordes).
      4. **Repertório:** Sugira músicas clássicas que utilizem a afinação e ritmo selecionados (ex: Pixinguinha para Choro, Cartola para Samba).
      
      **Tom de Voz:**
      - Profissional, encorajador e altamente técnico quando solicitado.
      - Use termos musicais corretos (Tônica, Terça, Dominante, Subdominante, Trítono, etc.).
      - Sempre responda em Português do Brasil.
      
      Se o aluno pedir exercícios, crie padrões que utilizem especificamente a 7ª corda grave disponível na afinação ${tuning}.
      Mantenha as respostas concisas e práticas.
    `;

    // Convert internal ChatMessage format to Gemini SDK format
    // Note: The SDK expects history to be Content objects.
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction },
      history: formattedHistory,
    });

    const response = await chat.sendMessage({ message: message });
    return response.text || "Não entendi, pode repetir?";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Desculpe, tive um problema de conexão. Tente novamente.";
  }
};
