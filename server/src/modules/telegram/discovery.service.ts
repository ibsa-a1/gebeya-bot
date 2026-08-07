import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { IntentService } from "../ai/intent.service";
import { TelegramApiClient } from "./telegram-api.client";

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intent: IntentService,
    private readonly api: TelegramApiClient,
  ) {}

  async handleDiscoveryUpdate(botToken: string, update: any) {
    const message = update.message;
    if (!message) return;
    const chatId = message.chat.id;

    try {
      if (message.text === "/start") {
        await this.api.sendMessage(
          botToken,
          chatId,
          "🔎 I search across every store on Gebeya Bot at once. Tell me what you're looking for!",
        );
        return;
      }

      if (!message.text) {
        await this.api.sendMessage(botToken, chatId, "Please type what you're looking for.");
        return;
      }

      let extracted;
      try {
        extracted = await this.intent.extractIntent(message.text);
      } catch (err) {
        this.logger.error(`extractIntent failed: ${err}`);
        await this.api.sendMessage(botToken, chatId, "Something went wrong — try again?");
        return;
      }

      const where: Record<string, unknown> = { tenant: { discoverable: true } };
      if (extracted.category) {
        where.category = { contains: extracted.category, mode: "insensitive" };
      }

      const products = await this.prisma.product.findMany({
        where,
        take: 5,
        include: { tenant: { select: { name: true, botUsername: true, currency: true } } },
        orderBy: { createdAt: "desc" },
      });

      if (products.length === 0) {
        await this.api.sendMessage(botToken, chatId, `Nothing found matching "${message.text}" yet.`);
        return;
      }

      const lines = products.map(
        (p) =>
          `• <b>${p.name}</b> — ${p.price} ${p.tenant.currency} at ${p.tenant.name} (@${p.tenant.botUsername})`,
      );

      await this.api.sendMessage(botToken, chatId, `Found across our stores:\n\n${lines.join("\n")}`);
    } catch (err) {
      // Covers a failed sendMessage itself (e.g. transient Telegram/network error) —
      // log it, ack the webhook normally, and don't let Telegram retry-storm the same update.
      this.logger.error(`handleDiscoveryUpdate failed: ${err}`);
    }
  }
}
