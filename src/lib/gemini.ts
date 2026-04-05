import { GoogleGenAI } from "@google/genai";

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";

export const isGeminiConfigured = geminiApiKey.length > 0;
export const missingGeminiEnvKeys = isGeminiConfigured ? [] : ["VITE_GEMINI_API_KEY"];

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient() {
  if (!isGeminiConfigured) {
    throw new Error("Gemini is not configured. Add VITE_GEMINI_API_KEY to your root .env file.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  }

  return geminiClient;
}
