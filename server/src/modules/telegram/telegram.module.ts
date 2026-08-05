import { Module } from "@nestjs/common";
import { TelegramController } from "./telegram.controller";
import { MiniAppController } from "./mini-app.controller";
import { TelegramBotService } from "./telegram-bot.service";
import { DiscoveryService } from "./discovery.service";
import { QrReceiptService } from "./qr-receipt.service";
import { TelegramApiClient } from "./telegram-api.client";
import { AuthModule } from "../auth/auth.module";
import { AiModule } from "../ai/ai.module";
import { ProductsModule } from "../products/products.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [AuthModule, AiModule, ProductsModule, OrdersModule],
  controllers: [TelegramController, MiniAppController],
  providers: [TelegramBotService, DiscoveryService, QrReceiptService, TelegramApiClient],
  exports: [QrReceiptService],
})
export class TelegramModule {}
