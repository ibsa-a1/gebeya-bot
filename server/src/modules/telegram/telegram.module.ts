import { Module, forwardRef } from "@nestjs/common";
import { TelegramController } from "./telegram.controller";
import { MiniAppController } from "./mini-app.controller";
import { TelegramBotService } from "./telegram-bot.service";
import { DiscoveryService } from "./discovery.service";
import { QrReceiptService } from "./qr-receipt.service";
import { TelegramApiClient } from "./telegram-api.client";
import { InitDataVerifier } from "./init-data-verifier.service";
import { AuthModule } from "../auth/auth.module";
import { AiModule } from "../ai/ai.module";
import { ProductsModule } from "../products/products.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  // forwardRef mirrors the one added on PaymentsModule's side — see the
  // comment there for why this circular import is genuine, not accidental.
  imports: [
    AuthModule,
    AiModule,
    ProductsModule,
    OrdersModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [TelegramController, MiniAppController],
  providers: [TelegramBotService, DiscoveryService, QrReceiptService, TelegramApiClient, InitDataVerifier],
  exports: [QrReceiptService],
})
export class TelegramModule {}
