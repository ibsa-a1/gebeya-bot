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
      const clientUrl = getEnv("CLIENT_URL");
      if (clientUrl.startsWith("https://")) {
        const miniAppUrl = `${clientUrl}/mini-app/${tenant.id}`;
        return this.api.sendMessage(tenant.botToken, chatId, "🛍️ Tap below to open the store:", {
          inline_keyboard: [[{ text: "Open Store", web_app: { url: miniAppUrl } }]],
        });
      }
      // Telegram requires HTTPS for web_app buttons — the Mini App frontend
      // doesn't have a real deployed HTTPS URL yet (that's Phase 12), so we
      // degrade gracefully here instead of crashing.
      return this.api.sendMessage(
        tenant.botToken,
        chatId,
        "🛍️ Our in-chat store is coming very soon! For now, just tell me what you're looking for.",
      );
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

    this.logger.log(`Extracted intent: ${JSON.stringify(extracted)}`);

    // Our current product model doesn't have structured size/color fields —
    // that data mostly lives embedded in product names (e.g. "Black Running
    // Shoes - Size 42") or the optional `variants` JSON, which our seed data
    // doesn't populate. Given that, the most honest available approach right
    // now is: match ANY extracted attribute (category, color, size) against
    // the product name — not perfect structured filtering, but meaningfully
    // better than ignoring color/size entirely.
    const searchTerms = [extracted.category, extracted.color, extracted.size].filter(
      (t): t is string => Boolean(t),
    );

    if (searchTerms.length === 0) {
      // Gemini genuinely couldn't extract anything usable — say so honestly
      // rather than silently returning the entire catalog, which would
      // misleadingly imply we understood the request.
      return this.api.sendMessage(
        tenant.botToken,
        chatId,
        "I didn't quite catch what you're looking for — could you try describing it again, or use /shop to browse everything?",
      );
    }

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        OR: searchTerms.flatMap((term) => [
          { category: { contains: term, mode: "insensitive" as const } },
          { name: { contains: term, mode: "insensitive" as const } },
        ]),
      },
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

    // Since we match on ANY extracted term (category/color/size), a result
    // might only partially match what was asked for (e.g. right category,
    // wrong color) — be honest about that instead of implying an exact match.
    const exactColorSize =
      (!extracted.color ||
        products.some((p) => p.name.toLowerCase().includes(extracted.color!.toLowerCase()))) &&
      (!extracted.size ||
        products.some((p) => p.name.toLowerCase().includes(extracted.size!.toLowerCase())));

    const introText = exactColorSize
      ? "Here's what I found:"
      : "I couldn't find an exact match, but here's the closest thing we have:";

    const lines = products.map(
      (p) => `• <b>${p.name}</b> — ${p.price} ${tenant.currency} (stock: ${p.stock})`,
    );
    const clientUrl = getEnv("CLIENT_URL");
    const replyMarkup = clientUrl.startsWith("https://")
      ? {
          inline_keyboard: [
            [{ text: "Open Store to Buy", web_app: { url: `${clientUrl}/mini-app/${tenant.id}` } }],
          ],
        }
      : undefined;

    return this.api.sendMessage(
      tenant.botToken,
      chatId,
      `${introText}\n\n${lines.join("\n")}`,
      replyMarkup,
    );
  }
}
