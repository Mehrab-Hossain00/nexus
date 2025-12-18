import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleEvent } from "../types";

/**
 * Lazy initialization of the Google GenAI SDK.
 * Uses process.env.API_KEY exclusively as required.
 */
function getAI() {
  const apiKey = process.env.API_KEY;
  return new GoogleGenAI({ apiKey: apiKey || "" });
}

const MODEL_ID = 'gemini-2.0-flash-exp';
const SYSTEM_INSTRUCTION = "Nexus AI Tutor: Elite academic companion. 1. Use LaTeX for math. 2. Provide clean, production-ready code. 3. Be professional, concise, and high-density. You are the Nexus Tutor.";

export const geminiService = {
  /**
   * High-speed streaming chat using Gemini 2.0 Flash Exp.
   */
  chatStream: async function* (messages: any[]): AsyncGenerator<string> {
    try {
      const ai = getAI();
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text || "" }]
      }));
      
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage.text || "Hello";

      const responseStream = await ai.models.generateContentStream({
        model: MODEL_ID,
        contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) yield chunk.text;
      }
    } catch (error: any) {
      console.error("Nexus Core Error:", error);
      throw new Error(error.message || "Intelligence link failed.");
    }
  },

  /**
   * Generates a structured study schedule using Gemini 2.0 Flash Exp.
   */
  generateSchedule: async (prompt: string): Promise<ScheduleEvent[]> => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: `Generate a high-performance study plan for: "${prompt}". Organize logically for maximum retention.`,
        config: {
          systemInstruction: "You are a master academic planner. Return a valid JSON array of schedule objects.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                startTime: { type: Type.STRING },
                durationMinutes: { type: Type.INTEGER },
                type: { type: Type.STRING, enum: ['study', 'break', 'exam', 'other'] },
                description: { type: Type.STRING }
              },
              required: ["title", "startTime", "durationMinutes", "type"]
            }
          }
        },
      });

      const text = response.text;
      const parsed = JSON.parse(text || "[]");
      return parsed.map((item: any) => ({
        ...item,
        id: crypto.randomUUID()
      }));
    } catch (error: any) {
      console.error("Scheduler Failure:", error);
      throw error;
    }
  },

  /**
   * Visual analysis using Gemini 2.0 Flash Exp.
   */
  analyzeImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image, mimeType } }
            ]
          }
        ],
        config: {
          systemInstruction: "Expert visual tutor. Deconstruct diagrams or explain visual notes with elite clarity."
        }
      });

      return response.text || "No analysis available.";
    } catch (error: any) {
      console.error("Vision Failure:", error);
      throw error;
    }
  }
};