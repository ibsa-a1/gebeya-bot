import { Injectable, BadGatewayException } from "@nestjs/common";
import { GoogleGenAI, Type } from "@google/genai";
import { getEnv } from "../../config/env.util";

export interface ExtractedIntent {
  category: string | null;
  size: string | null;
  color: string | null;
  maxPrice: number | null;
  intent: string;
}

@Injectable()
export class IntentService {
  private readonly ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: getEnv("GEMINI_API_KEY") });
  }

  async extractIntent(text: string): Promise<ExtractedIntent> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a shopping-intent parser for an Ethiopian e-commerce Telegram bot. Buyers write in Amharic, Afaan Oromo, English, or a mix, often colloquially. Extract structured shopping intent from the message below.

Message: """${text}"""

Return category, size, color, maxPrice (a number in Ethiopian Birr, or null if not mentioned), and a one-sentence intent summary in English.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, nullable: true },
            size: { type: Type.STRING, nullable: true },
            color: { type: Type.STRING, nullable: true },
            maxPrice: { type: Type.NUMBER, nullable: true },
            intent: { type: Type.STRING },
          },
          required: ["intent"],
        },
      },
    });

    if (!response.text) {
      throw new BadGatewayException("Gemini returned an empty response");
    }

    return JSON.parse(response.text) as ExtractedIntent;
  }
}
