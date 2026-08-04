import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { SttService } from "./stt.service";
import { IntentService } from "./intent.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [SttService, IntentService],
  exports: [SttService, IntentService],
})
export class AiModule {}
