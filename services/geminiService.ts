
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis, Track } from "../types";

// Initialize the GoogleGenAI client using the API key strictly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTrack = async (track: Track): Promise<AIAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the mood and vibe of this song: "${track.title}" by ${track.artist} (Genre: ${track.genre}). Provide a short poetic description and a suggested UI color palette (3 hex colors).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            description: { type: Type.STRING },
            colorPalette: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["mood", "description", "colorPalette"]
        }
      }
    });

    // Access .text property directly (not as a method)
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      mood: "Energetic",
      description: "A pulsating rhythm that drives you forward through the digital landscape.",
      colorPalette: ["#8b5cf6", "#ec4899", "#3b82f6"]
    };
  }
};
