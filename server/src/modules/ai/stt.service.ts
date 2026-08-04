import { Injectable, BadGatewayException } from "@nestjs/common";
import Groq, { toFile } from "groq-sdk";
import { getEnv } from "../../config/env.util";

@Injectable()
export class SttService {
  private readonly groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: getEnv("GROQ_API_KEY") });
  }

  async transcribe(fileUrl: string): Promise<string> {
    const audioResponse = await fetch(fileUrl);
    if (!audioResponse.ok) {
      throw new BadGatewayException(`Could not fetch audio file from ${fileUrl}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();

    const transcription = await this.groq.audio.transcriptions.create({
      model: "whisper-large-v3",
      file: await toFile(Buffer.from(arrayBuffer), "voice-note.ogg"),
      language: "am", // explicit Amharic — auto-detection just failed badly
      temperature: 0,
    });

    return transcription.text;
  }
}
