import { Controller, Get, Post, Param, Query, Body, BadRequestException, Inject, forwardRef, Logger } from "@nestjs/common";
import { ProductsService } from "../products/products.service";
import { OrdersService } from "../orders/orders.service";
import { QueryProductsDto } from "../products/dto/query-products.dto";
import { MiniAppCheckoutDto } from "./dto/mini-app-checkout.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";
import { InitDataVerifier } from "./init-data-verifier.service";
import { PaymentsService } from "../payments/payments.service";
import { TelegramApiClient } from "./telegram-api.client";

// Deliberately NO auth guards — buyers have no dashboard login, only a
// Telegram identity, verified per-request via signed initData below.
@Controller("mini-app/tenants/:tenantId")
export class MiniAppController {
  private readonly logger = new Logger(MiniAppController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly initDataVerifier: InitDataVerifier,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly telegramApi: TelegramApiClient,
  ) {}

  @Get("products")
  getProducts(@Param("tenantId") tenantId: string, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(tenantId, query);
  }

  @Post("checkout")
  async checkout(@Param("tenantId") tenantId: string, @Body() dto: MiniAppCheckoutDto) {
    const customerTelegramId = await this.resolveCustomerTelegramId(tenantId, dto);
    const order = await this.ordersService.create(tenantId, {
      customerTelegramId,
      items: dto.items,
    });

    // The order itself is fully created and stock decremented at this point
    // regardless of what happens next — payment initialization failing here
    // must not roll back a successful order, since the buyer can still be
    // sent a payment link manually or retry payment separately.
    try {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      const { checkoutUrl } = await this.paymentsService.initializeChapa(tenantId, {
        orderId: order.id,
      });

      if (tenant) {
        const botToken = this.crypto.decrypt(tenant.botToken);
        await this.telegramApi.sendMessage(
          botToken,
          customerTelegramId,
          `Your order is ready — tap below to complete payment.`,
          { inline_keyboard: [[{ text: "Pay Now", url: checkoutUrl }]] },
        );
      }
    } catch (err) {
      this.logger.error(`Chapa initialization or bot notification failed for order ${order.id}: ${err}`);
    }

    return order;
  }

  private async resolveCustomerTelegramId(
    tenantId: string,
    dto: MiniAppCheckoutDto,
  ): Promise<string> {
    if (dto.initData) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        throw new BadRequestException("Tenant not found");
      }
      const botToken = this.crypto.decrypt(tenant.botToken);
      const user = this.initDataVerifier.verify(dto.initData, botToken);
      return String(user.id);
    }

    if (dto.devTestTelegramId && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[MiniAppController] Using UNVERIFIED devTestTelegramId=${dto.devTestTelegramId} — this path is disabled in production.`,
      );
      return dto.devTestTelegramId;
    }

    throw new BadRequestException(
      "Missing or invalid Telegram session — open this store from within Telegram.",
    );
  }
}
