import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { SttService } from "./stt.service";
import { IntentService } from "./intent.service";
import { TranscribeDto } from "./dto/transcribe.dto";
import { ExtractIntentDto } from "./dto/extract-intent.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

/**
 * These HTTP endpoints exist for manual testing during development only.
 * The real production call path (Phase 10, the Telegram module) will call
 * SttService/IntentService directly via dependency injection — same module,
 * no HTTP round trip — so these routes are a convenience for verifying the
 * AI pipeline works before the bot wiring exists, not the final architecture.
 */
@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly sttService: SttService,
    private readonly intentService: IntentService,
  ) {}

  @Post("transcribe")
  async transcribe(@Body() dto: TranscribeDto) {
    const transcript = await this.sttService.transcribe(dto.fileUrl);
    return { transcript };
  }

  @Post("extract-intent")
  async extractIntent(@Body() dto: ExtractIntentDto) {
    return this.intentService.extractIntent(dto.text);
  }
}
