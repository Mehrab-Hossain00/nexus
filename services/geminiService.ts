import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleEvent } from "../types";

/**
 * INITIALIZATION
 * Using the provided process.env.API_KEY which is managed by the environment.
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = "Nexus AI Tutor: Elite academic companion. 1. Use LaTeX for math (e.g., $E=mc^2$). 2. Provide clean, production-ready code. 3. Be professional, concise, and high-density. 4. You are the Nexus Tutor, a peak-performance intelligence core.";

export const geminiService = {
  /**
   * High-speed streaming chat using Gemini 3 Flash.
   * This provides real-time word-by-word updates to the UI.
   */
  chatStream: async function* (messages: any[]): AsyncGenerator<string> {
    try {
      // Map standard message format to Gemini-compliant history
      // Note: We only take the previous messages as history.
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text || m.content || "" }]
      }));
      
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage.text || lastMessage.content || "Hello";

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        // Access .text property as per SDK rules
        const text = chunk.text;
        if (text) {
          yield text;
        }
      }
    } catch (error: any) {
      console.error("Nexus Core Error:", error);
      // Clean error message for user display
      let errorMessage = "Intelligence link failed.";
      if (error.message?.includes("401") || error.message?.includes("API_KEY")) {
        errorMessage = "Nexus Authorization Failed. Please check system credentials.";
      }
      throw new Error(errorMessage);
    }
  },

  /**
   * Generates a structured study schedule using Gemini 3 Pro.
   * Pro model used for higher reasoning in scheduling logic.
   */
  generateSchedule: async (prompt: string): Promise<ScheduleEvent[]> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a high-performance study plan for: "${prompt}". Organize logically for maximum retention.`,
        config: {
          systemInstruction: "You are a master academic planner. Return a valid JSON array of schedule objects.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Clear, actionable session title" },
                subject: { type: Type.STRING },
                startTime: { type: Type.STRING, description: "Format: HH:mm" },
                durationMinutes: { type: Type.INTEGER },
                type: { type: Type.STRING, enum: ['study', 'break', 'exam', 'other'] },
                description: { type: Type.STRING, description: "Brief goal for this session" }
              },
              required: ["title", "startTime", "durationMinutes", "type"]
            }
          }
        },
      });

      const text = response.text;
      const parsed = JSON.parse(text || "[]");
      const events = Array.isArray(parsed) ? parsed : (parsed.schedule || []);
      
      return events.map((item: any) => ({
        ...item,
        id: crypto.randomUUID()
      }));
    } catch (error: any) {
      console.error("Scheduler Logic Failure:", error);
      throw error;
    }
  },

  /**
   * Visual analysis using Gemini 3 Flash.
   */
  analyzeImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image, mimeType } }
            ]
          }
        ],
        config: {
          systemInstruction: "Expert visual tutor. Deconstruct diagrams, solve math from images, or explain visual notes with elite clarity."
        }
      });

      return response.text || "Core analysis returned no data.";
    } catch (error: any) {
      console.error("Vision Core Failure:", error);
      throw error;
    }
  }
};