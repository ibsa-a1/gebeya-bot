import { Injectable, BadGatewayException } from "@nestjs/common";
import Groq from "groq-sdk";
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

    // groq-sdk accepts a raw fetch Response directly as the `file` param —
    // no manual buffering needed.
    const transcription = await this.groq.audio.transcriptions.create({
      model: "whisper-large-v3-turbo",
      file: audioResponse,
    });

    return transcription.text;
  }
}
