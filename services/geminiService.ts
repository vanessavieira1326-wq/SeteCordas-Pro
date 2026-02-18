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
      Você é um professor de violão de 7 cordas experiente e encorajador.
      O aluno está com a 7ª corda afinada em: ${tuning}.
      O foco de estudo atual é o ritmo: ${rhythm}.
      
      Responda às perguntas do aluno de forma didática, técnica e musical.
      Se o aluno pedir exercícios, leve em consideração a afinação da 7ª corda e o ritmo escolhido.
      Mantenha as respostas concisas (máximo 2-3 parágrafos) a menos que o aluno peça detalhes profundos.
      Sempre responda em Português do Brasil.
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