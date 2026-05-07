
import { GoogleGenAI } from "@google/genai";

// Standardizing the response generation service to follow @google/genai guidelines.
export const generateGeminiResponse = async (
  prompt: string,
  context: string,
  history: { role: 'user' | 'assistant', text: string }[]
) => {
  // Always use a named parameter and direct process.env.API_KEY access.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are an elite Sports Scientist and Strength & Conditioning Coach.
    You assist trainers in creating periodized plans, calculating 1RM loads (e.g., 80% of a 120kg squat is 96kg), and analyzing athlete RPE (Rate of Perceived Exertion).
    RPE Scale: 1-10 (10 being max effort).
    When asked to create a plan, provide a structured table or list with Sets, Reps, %1RM, and RPE.
    Use professional terminology: Mesocycles, Microcycles, Tapering, Progressive Overload, and Acute:Chronic Workload Ratio.
  `;

  // Standardizing multi-turn contents format.
  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })),
    {
      role: 'user',
      parts: [{ text: `Current Dashboard Context (Clients/Exercises/Stats):\n${context}\n\nTrainer Query: ${prompt}` }]
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents as any,
      config: {
        systemInstruction,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    // Directly access the .text property as per guidelines.
    return response.text || "I'm sorry, I couldn't process that sports science query.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
