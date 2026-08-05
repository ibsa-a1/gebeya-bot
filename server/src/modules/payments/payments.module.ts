import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { ChapaProvider } from "./providers/chapa.provider";
import { MockTelebirrProvider } from "./providers/mock-telebirr.provider";
import { AuthModule } from "../auth/auth.module";
import { TelegramModule } from "../telegram/telegram.module";

@Module({
  imports: [AuthModule, TelegramModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ChapaProvider, MockTelebirrProvider],
})
export class PaymentsModule {}
