import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("OrdersService", () => {
  let service: OrdersService;
  let tx: {
    product: { findFirst: jest.Mock; updateMany: jest.Mock };
    order: { create: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
    order: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    tx = {
      product: { findFirst: jest.fn(), updateMany: jest.fn() },
      order: { create: jest.fn() },
    };
    prisma = {
      // The array-form $transaction (used by findAll) and the interactive
      // callback-form (used by create) have different signatures — this
      // mock supports both by checking which form it was called with.
      $transaction: jest.fn(async (arg) => {
        if (typeof arg === "function") {
          return arg(tx);
        }
        return Promise.all(arg);
      }),
      order: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(OrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("throws BadRequestException for an order with no items", async () => {
      await expect(
        service.create("tenant-a", { customerTelegramId: "123", items: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException if a product doesn't belong to this tenant", async () => {
      tx.product.findFirst.mockResolvedValue(null);

      await expect(
        service.create("tenant-b", {
          customerTelegramId: "123",
          items: [{ productId: "product-from-tenant-a", quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(tx.product.updateMany).not.toHaveBeenCalled();
    });

    it("throws ConflictException when stock is insufficient, using a conditional UPDATE rather than a separate read-then-check", async () => {
      tx.product.findFirst.mockResolvedValue({
        id: "product-1",
        name: "Leather Jacket",
        price: "3200",
        stock: 5,
      });
      // This is the core race-condition defense being tested: the count
      // of rows actually matched by `stock >= quantity` is what determines
      // success — not a value read moments earlier.
      tx.product.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.create("tenant-a", {
          customerTelegramId: "123",
          items: [{ productId: "product-1", quantity: 100 }],
        }),
      ).rejects.toThrow(ConflictException);

      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: "product-1", tenantId: "tenant-a", stock: { gte: 100 } },
        data: { stock: { decrement: 100 } },
      });
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it("does not attempt to create the order if any single item in a multi-item order fails", async () => {
      // Item 1 succeeds, item 2 fails — the whole order must not be created.
      tx.product.findFirst
        .mockResolvedValueOnce({ id: "product-1", name: "Jacket", price: "100", stock: 10 })
        .mockResolvedValueOnce({ id: "product-2", name: "Shoes", price: "50", stock: 1 });
      tx.product.updateMany
        .mockResolvedValueOnce({ count: 1 }) // item 1 decrements fine
        .mockResolvedValueOnce({ count: 0 }); // item 2 has insufficient stock

      await expect(
        service.create("tenant-a", {
          customerTelegramId: "123",
          items: [
            { productId: "product-1", quantity: 1 },
            { productId: "product-2", quantity: 5 },
          ],
        }),
      ).rejects.toThrow(ConflictException);

      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it("calculates totalAmount from the product's price at the time of purchase, and creates the order on success", async () => {
      tx.product.findFirst.mockResolvedValue({
        id: "product-1",
        name: "Jacket",
        price: "3200",
        stock: 8,
      });
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.order.create.mockResolvedValue({ id: "order-1", totalAmount: 9600 });

      await service.create("tenant-a", {
        customerTelegramId: "123",
        items: [{ productId: "product-1", quantity: 3 }],
      });

      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant-a",
            totalAmount: 9600,
            status: "PENDING",
          }),
        }),
      );
    });
  });

  describe("findOne — tenant isolation, same pattern as Products", () => {
    it("throws NotFoundException for an order belonging to a different tenant", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne("tenant-b", "order-from-tenant-a")).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order-from-tenant-a", tenantId: "tenant-b" },
        }),
      );
    });
  });

  describe("updateStatus", () => {
    it("refuses to update an order belonging to a different tenant", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus("tenant-b", "order-from-tenant-a", { status: "COMPLETED" as any }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});
