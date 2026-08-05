import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SttService } from "../ai/stt.service";
import { IntentService } from "../ai/intent.service";
import { TelegramApiClient } from "./telegram-api.client";
import { getEnv } from "../../config/env.util";

interface TenantContext {
  id: string;
  botToken: string; // already decrypted by the controller
  currency: string;
}

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stt: SttService,
    private readonly intent: IntentService,
    private readonly api: TelegramApiClient,
  ) {}

  async handleTenantUpdate(tenant: TenantContext, update: any) {
    const message = update.message;
    if (!message) return;

    const chatId = message.chat.id;

    if (message.text === "/start") {
      return this.api.sendMessage(
        tenant.botToken,
        chatId,
        "👋 Welcome! Send me a voice note or type what you're looking for, and I'll find it for you.\n\nTry /shop to browse the full catalog.",
      );
    }

    if (message.text === "/shop") {
      const miniAppUrl = `${getEnv("CLIENT_URL")}/mini-app/${tenant.id}`;
      return this.api.sendMessage(tenant.botToken, chatId, "🛍️ Tap below to open the store:", {
        inline_keyboard: [[{ text: "Open Store", web_app: { url: miniAppUrl } }]],
      });
    }

    if (message.text === "/help") {
      return this.api.sendMessage(
        tenant.botToken,
        chatId,
        "Commands:\n/shop - browse the store\n/help - this message\n\nOr just send a voice note or type what you're looking for!",
      );
    }

    let searchText: string | null = null;

    if (message.voice) {
      try {
        const fileUrl = await this.api.getFile(tenant.botToken, message.voice.file_id);
        searchText = await this.stt.transcribe(fileUrl);
      } catch (err) {
        this.logger.error("Voice transcription failed", err as Error);
        return this.api.sendMessage(
          tenant.botToken,
          chatId,
          "Sorry, I couldn't understand that voice note. Could you try typing what you're looking for instead?",
        );
      }
    } else if (message.text) {
      searchText = message.text;
    }

    if (!searchText) {
      return this.api.sendMessage(
        tenant.botToken,
        chatId,
        "I didn't quite catch that — try sending a voice note or typing what you're looking for.",
      );
    }

    return this.searchAndReply(tenant, chatId, searchText);
  }

  private async searchAndReply(tenant: TenantContext, chatId: number, searchText: string) {
    let extracted;
    try {
      extracted = await this.intent.extractIntent(searchText);
    } catch (err) {
      this.logger.error("Intent extraction failed", err as Error);
      return this.api.sendMessage(
        tenant.botToken,
        chatId,
        "Something went wrong understanding that — mind trying again?",
      );
    }

    const where: Record<string, unknown> = { tenantId: tenant.id };
    if (extracted.category) {
      where.category = { contains: extracted.category, mode: "insensitive" };
    }

    const products = await this.prisma.product.findMany({
      where,
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    if (products.length === 0) {
      return this.api.sendMessage(
        tenant.botToken,
        chatId,
        `I couldn't find anything matching "${extracted.intent}". Try /shop to browse everything we have.`,
      );
    }

    const lines = products.map(
      (p) => `• <b>${p.name}</b> — ${p.price} ${tenant.currency} (stock: ${p.stock})`,
    );
    const miniAppUrl = `${getEnv("CLIENT_URL")}/mini-app/${tenant.id}`;

    return this.api.sendMessage(
      tenant.botToken,
      chatId,
      `Here's what I found:\n\n${lines.join("\n")}`,
      { inline_keyboard: [[{ text: "Open Store to Buy", web_app: { url: miniAppUrl } }]] },
    );
  }
}
