import { Injectable, Logger } from "@nestjs/common";
import * as QRCode from "qrcode";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";
import { TelegramApiClient } from "./telegram-api.client";

@Injectable()
export class QrReceiptService {
  private readonly logger = new Logger(QrReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly api: TelegramApiClient,
  ) {}

  async sendReceiptForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, tenant: true },
    });
    if (!order) {
      this.logger.warn(`sendReceiptForOrder: order ${orderId} not found`);
      return;
    }

    const qrCode = order.qrCode ?? randomUUID();
    if (!order.qrCode) {
      await this.prisma.order.update({ where: { id: order.id }, data: { qrCode } });
    }

    const qrImageBuffer = await QRCode.toBuffer(qrCode, { width: 400 });
    const botToken = this.crypto.decrypt(order.tenant.botToken);
    const itemLines = order.items
      .map((i) => `${i.quantity}x — ${i.priceAtPurchase} ${order.tenant.currency}`)
      .join("\n");

    const caption = `✅ Payment received!\n\nOrder: ${order.id}\nTotal: ${order.totalAmount} ${order.tenant.currency}\n\n${itemLines}\n\nShow this QR code at delivery.`;

    await this.api.sendPhoto(botToken, order.customerTelegramId, qrImageBuffer, caption);
  }
}
