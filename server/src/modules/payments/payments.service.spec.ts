import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";
import { ChapaProvider } from "./providers/chapa.provider";
import { MockTelebirrProvider } from "./providers/mock-telebirr.provider";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prisma: {
    order: { findFirst: jest.Mock; update: jest.Mock };
    tenant: { findUnique: jest.Mock };
    payment: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let crypto: { encrypt: jest.Mock; decrypt: jest.Mock };
  let chapa: { initialize: jest.Mock };
  let mockTelebirr: { initialize: jest.Mock };

  beforeEach(async () => {
    prisma = {
      order: { findFirst: jest.fn(), update: jest.fn() },
      tenant: { findUnique: jest.fn() },
      payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    crypto = {
      encrypt: jest.fn((v: string) => `encrypted(${v})`),
      decrypt: jest.fn((v: string) => v.replace(/^encrypted\((.*)\)$/, "$1")),
    };
    chapa = { initialize: jest.fn() };
    mockTelebirr = { initialize: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: crypto },
        { provide: ChapaProvider, useValue: chapa },
        { provide: MockTelebirrProvider, useValue: mockTelebirr },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("initializeChapa", () => {
    it("throws NotFoundException for an order belonging to a different tenant", async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.initializeChapa("tenant-b", { orderId: "order-from-tenant-a" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException if the tenant has no Chapa key configured", async () => {
      prisma.order.findFirst.mockResolvedValue({ id: "order-1", totalAmount: "100" });
      prisma.tenant.findUnique.mockResolvedValue({ chapaSecretKey: null });

      await expect(
        service.initializeChapa("tenant-a", { orderId: "order-1" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("decrypts the tenant's Chapa key before calling the provider, never the raw stored value", async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: "order-1",
        totalAmount: "3200",
        customerTelegramId: "123",
      });
      prisma.tenant.findUnique.mockResolvedValue({
        chapaSecretKey: "encrypted(REAL_SECRET)",
        currency: "ETB",
        botUsername: "TestBot",
      });
      chapa.initialize.mockResolvedValue({
        checkoutUrl: "https://checkout.chapa.co/xyz",
        txRef: "some-ref",
      });
      prisma.payment.create.mockResolvedValue({});

      await service.initializeChapa("tenant-a", { orderId: "order-1" });

      expect(crypto.decrypt).toHaveBeenCalledWith("encrypted(REAL_SECRET)");
      expect(chapa.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ secretKey: "REAL_SECRET", amount: 3200 }),
      );
    });
  });

  describe("processWebhook (via handleChapaWebhook) — idempotency is the core guarantee", () => {
    it("throws NotFoundException for an unrecognized txRef", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleChapaWebhook({ tx_ref: "unknown-ref", status: "success" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("processes a payment exactly once on first delivery", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        txRef: "ref-1",
        status: "INITIATED",
        orderId: "order-1",
      });

      const result = await service.handleChapaWebhook({ tx_ref: "ref-1", status: "success" });

      expect(result).toEqual({ alreadyProcessed: false, status: "SUCCESS" });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("does NOT reprocess a payment that has already been finalized — the actual idempotency test", async () => {
      // This is the scenario that matters most: a duplicate webhook delivery
      // (a real, documented occurrence with payment providers) for a txRef
      // whose status is already SUCCESS, not INITIATED.
      prisma.payment.findUnique.mockResolvedValue({
        txRef: "ref-1",
        status: "SUCCESS", // already processed by an earlier delivery
        orderId: "order-1",
      });

      const result = await service.handleChapaWebhook({ tx_ref: "ref-1", status: "success" });

      expect(result).toEqual({ alreadyProcessed: true, status: "SUCCESS" });
      // The critical assertion: no database write happens on the duplicate.
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("marks the payment FAILED and does not touch order status when the provider reports failure", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        txRef: "ref-2",
        status: "INITIATED",
        orderId: "order-1",
      });
      prisma.payment.update.mockResolvedValue({});

      const result = await service.handleChapaWebhook({ tx_ref: "ref-2", status: "failed" });

      expect(result).toEqual({ alreadyProcessed: false, status: "FAILED" });
      // Only the payment update should be in the transaction, not an order update.
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.anything()]),
      );
      const transactionArg = prisma.$transaction.mock.calls[0][0];
      expect(transactionArg).toHaveLength(1); // payment update only, no order update
    });
  });
});
