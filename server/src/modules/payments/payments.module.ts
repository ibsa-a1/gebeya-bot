import { Module, forwardRef } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { ChapaProvider } from "./providers/chapa.provider";
import { MockTelebirrProvider } from "./providers/mock-telebirr.provider";
import { AuthModule } from "../auth/auth.module";
import { TelegramModule } from "../telegram/telegram.module";

@Module({
  // forwardRef here + on TelegramModule's side resolves a genuine circular
  // dependency: PaymentsService needs QrReceiptService (from TelegramModule)
  // to push receipts, and MiniAppController (also in TelegramModule) needs
  // PaymentsService to initialize Chapa checkout right after order creation.
  imports: [AuthModule, forwardRef(() => TelegramModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService, ChapaProvider, MockTelebirrProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
