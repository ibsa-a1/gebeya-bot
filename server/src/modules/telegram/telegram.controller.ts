import { Controller, Post, Param, Body } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";
import { TelegramBotService } from "./telegram-bot.service";
import { DiscoveryService } from "./discovery.service";
import { getEnv } from "../../config/env.util";

@Controller("telegram")
export class TelegramController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly botService: TelegramBotService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  @Post("webhook/tenant/:tenantId")
  async tenantWebhook(@Param("tenantId") tenantId: string, @Body() update: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { ok: true }; // never error back to Telegram — ack and drop silently

    const botToken = this.crypto.decrypt(tenant.botToken);
    await this.botService.handleTenantUpdate(
      { id: tenant.id, botToken, currency: tenant.currency },
      update,
    );
    return { ok: true };
  }

  @Post("webhook/platform/auth")
  async authBotWebhook(@Body() update: any) {
    // The Auth Bot's real job is the Login Widget (handled directly in
    // AuthController via /auth/telegram), not conversational commands.
    // This route only exists so Telegram doesn't get a 404 if it delivers
    // anything here.
    return { ok: true };
  }

  @Post("webhook/platform/discovery")
  async discoveryWebhook(@Body() update: any) {
    await this.discoveryService.handleDiscoveryUpdate(
      getEnv("PLATFORM_DISCOVERY_BOT_TOKEN"),
      update,
    );
    return { ok: true };
  }
}
