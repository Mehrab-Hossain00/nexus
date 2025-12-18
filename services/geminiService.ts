import { ScheduleEvent } from "../types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = "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";

/**
 * Fallback chain for free models. 
 * We use models that have high availability on OpenRouter's free tier.
 */
const MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/learnlm-1.5-pro-experimental:free",
  "mistralai/mistral-7b-instruct:free",
  "openchat/openchat-7b:free",
  "huggingfaceh4/zephyr-7b-beta:free"
];

const SYSTEM_INSTRUCTION = "You are the Nexus AI Tutor, an elite academic companion. 1. Use LaTeX for ALL math/science formulas (e.g. $E=mc^2$). 2. Provide clean, documented code snippets. 3. Maintain a professional, high-performance, and encouraging tone. Keep responses concise but information-dense.";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Hardened OpenRouter request handler with Retries and Model Fallbacks
 */
async function openRouterRequest(body: any, attempts = 0, modelIndex = 0): Promise<any> {
  const currentModel = MODELS[modelIndex] || MODELS[0];
  const requestBody = { ...body, model: currentModel };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Nexus Study Pro"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = (data.error?.message || response.statusText || "Unknown API Error").toLowerCase();
      
      // Check if we should fall back: 
      // 429 = Rate Limit
      // 400 = Bad Request (often 'invalid model ID')
      // Provider returned error = common OpenRouter free tier message
      const shouldFallback = 
        response.status === 429 || 
        response.status === 400 || 
        errorMsg.includes("provider returned error") || 
        errorMsg.includes("valid model id") ||
        errorMsg.includes("not found");

      if (shouldFallback) {
        // 1. If it's a rate limit (429), try one retry with backoff on the SAME model
        if (response.status === 429 && attempts < 1) {
          await sleep(2000);
          return openRouterRequest(body, attempts + 1, modelIndex);
        }
        
        // 2. Otherwise (or if retry failed), move to the next fallback model
        if (modelIndex < MODELS.length - 1) {
          console.warn(`Nexus Core: Model ${currentModel} unavailable/invalid. Shifting to ${MODELS[modelIndex + 1]}...`);
          return openRouterRequest(body, 0, modelIndex + 1);
        }
      }

      throw new Error(`OpenRouter (${response.status}): ${data.error?.message || response.statusText}`);
    }

    return data;
  } catch (error: any) {
    // Catch networking errors or sudden timeouts
    if (attempts < 1) {
      await sleep(1000);
      return openRouterRequest(body, attempts + 1, modelIndex);
    }
    throw error;
  }
}

export const geminiService = {
  chat: async (messages: any[]) => {
    return await openRouterRequest({
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        ...messages
      ]
    });
  },

  generateSchedule: async (prompt: string): Promise<ScheduleEvent[]> => {
    try {
      const data = await openRouterRequest({
        messages: [
          { 
            role: "system", 
            content: "Generate a high-performance study schedule. Return ONLY a raw JSON array. No markdown, no preamble." 
          },
          { 
            role: "user", 
            content: `Task: Generate a study schedule for: "${prompt}". Return as a raw JSON array of objects with keys: title, subject, startTime (HH:mm), durationMinutes (int), type (study/break/exam/other), and description.` 
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No intelligence data returned from core.");

      // Robust JSON extraction
      const jsonString = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(jsonString);
      
      const events = Array.isArray(parsed) ? parsed : (parsed.schedule || []);
      return events.map((item: any) => ({
        ...item,
        id: crypto.randomUUID()
      }));
    } catch (error: any) {
      console.error("Scheduler Failure:", error);
      throw error;
    }
  },

  analyzeImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
      const data = await openRouterRequest({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ]
      });

      return data.choices?.[0]?.message?.content || "Core intelligence was unable to interpret this asset.";
    } catch (error: any) {
      console.error("Vision Analysis Failure:", error);
      throw error;
    }
  }
};