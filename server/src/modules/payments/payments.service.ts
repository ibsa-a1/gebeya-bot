import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";
import { ChapaProvider } from "./providers/chapa.provider";
import { MockTelebirrProvider } from "./providers/mock-telebirr.provider";
import { QrReceiptService } from "../telegram/qr-receipt.service";
import { InitializePaymentDto } from "./dto/initialize-payment.dto";
import { ChapaWebhookDto } from "./dto/chapa-webhook.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly chapa: ChapaProvider,
    private readonly mockTelebirr: MockTelebirrProvider,
    private readonly qrReceipt: QrReceiptService,
  ) {}

  private async getOrderForPayment(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!order) {
      throw new NotFoundException("Order not found for this tenant");
    }
    return order;
  }

  async initializeChapa(tenantId: string, dto: InitializePaymentDto) {
    const order = await this.getOrderForPayment(tenantId, dto.orderId);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.chapaSecretKey) {
      throw new BadRequestException(
        "This tenant has no Chapa secret key configured yet — set it via PATCH /tenants/:tenantId first",
      );
    }

    const secretKey = this.crypto.decrypt(tenant.chapaSecretKey);
    const txRef = `gebeya-${order.id}-${randomUUID().slice(0, 8)}`;

    const result = await this.chapa.initialize({
      secretKey,
      amount: Number(order.totalAmount),
      currency: tenant.currency,
      txRef,
      returnUrl: `https://t.me/${tenant.botUsername}`,
      customerTelegramId: order.customerTelegramId,
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "CHAPA",
        status: "INITIATED",
        amount: order.totalAmount,
        txRef,
      },
    });

    return { checkoutUrl: result.checkoutUrl, txRef };
  }

  async initializeMockTelebirr(tenantId: string, dto: InitializePaymentDto) {
    const order = await this.getOrderForPayment(tenantId, dto.orderId);
    const txRef = `mock-telebirr-${order.id}-${randomUUID().slice(0, 8)}`;

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "TELEBIRR_MOCK",
        status: "INITIATED",
        amount: order.totalAmount,
        txRef,
      },
    });

    const result = this.mockTelebirr.initialize({
      txRef,
      webhookCallback: () => this.handleTelebirrMockWebhook(txRef),
    });

    return result;
  }

  async handleChapaWebhook(dto: ChapaWebhookDto) {
    return this.processWebhook(dto.tx_ref, dto.status === "success", dto);
  }

  async handleTelebirrMockWebhook(txRef: string) {
    // Mock always "succeeds" after its simulated delay — there's no real
    // failure path to simulate meaningfully without a real provider.
    return this.processWebhook(txRef, true, { mock: true, txRef });
  }

  /**
   * The actual idempotency guarantee: relies on Payment.txRef being @unique
   * in the schema, PLUS an explicit status check here. If this txRef has
   * already been processed (status is no longer INITIATED), this is a no-op —
   * a duplicate webhook delivery from Chapa (a real, documented occurrence)
   * cannot double-apply a payment or flip an already-PAID order twice.
   */
  private async processWebhook(txRef: string, succeeded: boolean, rawPayload: unknown) {
    const payment = await this.prisma.payment.findUnique({ where: { txRef } });

    if (!payment) {
      throw new NotFoundException(`No payment found for txRef ${txRef}`);
    }

    if (payment.status !== "INITIATED") {
      // Already processed — duplicate webhook delivery. Safe no-op.
      return { alreadyProcessed: true, status: payment.status };
    }

    const newStatus = succeeded ? "SUCCESS" : "FAILED";

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { txRef },
        data: { status: newStatus, webhookPayload: rawPayload as any },
      }),
      ...(succeeded
        ? [
            this.prisma.order.update({
              where: { id: payment.orderId },
              data: { status: "PAID" as const },
            }),
          ]
        : []),
    ]);

    if (succeeded) {
      await this.qrReceipt.sendReceiptForOrder(payment.orderId);
    }

    return { alreadyProcessed: false, status: newStatus };
  }
}
