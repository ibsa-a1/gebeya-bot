import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
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

  // Webhooks are NOT behind JwtAuthGuard/TenantGuard — Chapa itself calls
  // this, it has no user session. Real signature verification (Chapa signs
  // its webhooks) is a hardening item worth adding before real production
  // traffic — flagging honestly rather than pretending this is fully secure
  // as written.
  @Post("webhook/chapa")
  @HttpCode(HttpStatus.OK)
  handleChapaWebhook(@Body() dto: ChapaWebhookDto) {
    return this.paymentsService.handleChapaWebhook(dto);
  }
}
