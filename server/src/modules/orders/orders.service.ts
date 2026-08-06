import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { QueryOrdersDto } from "./dto/query-orders.dto";

const PAGE_SIZE = 20;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateOrderDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException("An order must contain at least one item");
    }

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product ${item.productId} not found for this tenant`,
          );
        }

        const decremented = await tx.product.updateMany({
          where: { id: item.productId, tenantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (decremented.count === 0) {
          throw new ConflictException(
            `Insufficient stock for "${product.name}" — only ${product.stock} left`,
          );
        }

        const price = Number(product.price);
        totalAmount += price * item.quantity;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: price,
          variant: item.variant as Prisma.InputJsonValue,
        });
      }

      return tx.order.create({
        data: {
          tenantId,
          customerTelegramId: dto.customerTelegramId,
          status: "PENDING",
          totalAmount,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
    });
  }

  async findAll(tenantId: string, query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const where = { tenantId, ...(query.status ? { status: query.status } : {}) };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: { include: { product: true } } },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page };
  }

  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: { include: { product: true } }, payments: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  async updateStatus(tenantId: string, orderId: string, dto: UpdateOrderStatusDto) {
    await this.findOne(tenantId, orderId);

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
  }
}
