import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { PaymentsService } from "./payments.service";
import { InitializePaymentDto } from "./dto/initialize-payment.dto";
import { ChapaWebhookDto } from "./dto/chapa-webhook.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("chapa/initialize/:tenantId")
  @UseGuards(JwtAuthGuard, TenantGuard)
  initializeChapa(@Param("tenantId") tenantId: string, @Body() dto: InitializePaymentDto) {
    return this.paymentsService.initializeChapa(tenantId, dto);
  }

  @Post("mock-telebirr/initialize/:tenantId")
  @UseGuards(JwtAuthGuard, TenantGuard)
  initializeMockTelebirr(@Param("tenantId") tenantId: string, @Body() dto: InitializePaymentDto) {
    return this.paymentsService.initializeMockTelebirr(tenantId, dto);
  }

  // TEMPORARY manual fallback (Phase 13, Aug 2026): Chapa's sandbox has been
  // observed to complete real payments without ever delivering the
  // corresponding webhook (confirmed via Chapa's own dashboard showing
  // successful transactions with no webhook fired). This endpoint lets a
  // dashboard user manually trigger a status check for a given transaction
  // instead of waiting indefinitely for a webhook that may never arrive.
  // A proper automated version (bot-triggered /status check, or a scheduled
  // polling job) is planned as a real Phase 14/15 feature — this is
  // deliberately minimal, staff-triggered, and not buyer-facing yet.
  @Post("chapa/verify/:tenantId/:txRef")
  @UseGuards(JwtAuthGuard, TenantGuard)
  verifyChapaPayment(@Param("tenantId") tenantId: string, @Param("txRef") txRef: string) {
    return this.paymentsService.verifyChapaPayment(tenantId, txRef);
  }

  // Webhooks are NOT behind JwtAuthGuard/TenantGuard — Chapa itself calls
  // this, it has no user session. Authenticity is instead verified via
  // HMAC-SHA256 signature (see PaymentsService.handleChapaWebhook), using
  // the raw, unparsed request body — req.rawBody is only populated because
  // main.ts enables { rawBody: true } on the Nest app.
  @Post("webhook/chapa")
  @HttpCode(HttpStatus.OK)
  handleChapaWebhook(@Req() req: RawBodyRequest<Request>, @Body() dto: ChapaWebhookDto) {
    return this.paymentsService.handleChapaWebhook(dto, req.rawBody, req.headers);
  }
}
