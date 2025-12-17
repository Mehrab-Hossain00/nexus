import { GoogleGenAI, Type, Content } from "@google/genai";
import { ScheduleEvent } from "../types";

export const geminiService = {
  // Create a chat instance using the high-performance Gemini 3 Pro model
  createChat: (history: Content[] = []) => {
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    return ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history,
      config: {
        systemInstruction: "You are the Nexus AI Tutor, an elite academic companion. 1. Use LaTeX for ALL math/science formulas (e.g. $E=mc^2$). 2. Provide clean, documented code snippets. 3. Maintain a professional, high-performance, and encouraging tone. Keep responses concise but information-dense.",
      }
    });
  },

  generateSchedule: async (prompt: string): Promise<ScheduleEvent[]> => {
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Task: Generate a high-performance study schedule for: "${prompt}". Return as a raw JSON array of objects with keys: title, subject, startTime (HH:mm), durationMinutes (int), type (study/break/exam/other), and description.`,
        config: {
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
                type: { 
                  type: Type.STRING, 
                  description: "The type of event: study, break, exam, or other" 
                },
                description: { type: Type.STRING }
              },
              propertyOrdering: ["title", "subject", "startTime", "durationMinutes", "type", "description"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      return data.map((item: any) => ({ ...item, id: crypto.randomUUID() }));
    } catch (error) {
      console.error("Schedule generation failed:", error);
      throw error;
    }
  },

  analyzeImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: prompt }
          ]
        }
      });
      return response.text || "I was unable to analyze this asset.";
    } catch (error) {
      console.error("Image analysis failed:", error);
      throw error;
    }
  }
};