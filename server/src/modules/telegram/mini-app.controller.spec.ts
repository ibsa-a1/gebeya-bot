import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { MiniAppController } from "./mini-app.controller";
import { ProductsService } from "../products/products.service";
import { OrdersService } from "../orders/orders.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";
import { InitDataVerifier } from "./init-data-verifier.service";

describe("MiniAppController — the actual security boundary", () => {
  let controller: MiniAppController;
  let ordersService: { create: jest.Mock };
  let prisma: { tenant: { findUnique: jest.Mock } };
  let crypto: { decrypt: jest.Mock };
  let initDataVerifier: { verify: jest.Mock };

  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    ordersService = { create: jest.fn().mockResolvedValue({ id: "order-1" }) };
    prisma = { tenant: { findUnique: jest.fn() } };
    crypto = { decrypt: jest.fn().mockReturnValue("decrypted-bot-token") };
    initDataVerifier = { verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MiniAppController],
      providers: [
        { provide: ProductsService, useValue: { findAll: jest.fn() } },
        { provide: OrdersService, useValue: ordersService },
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: crypto },
        { provide: InitDataVerifier, useValue: initDataVerifier },
      ],
    }).compile();

    controller = module.get(MiniAppController);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  it("rejects checkout with neither initData nor devTestTelegramId", async () => {
    await expect(
      controller.checkout("tenant-1", { items: [{ productId: "p1", quantity: 1 }] } as any),
    ).rejects.toThrow(BadRequestException);
    expect(ordersService.create).not.toHaveBeenCalled();
  });

  it("verifies initData against the TENANT'S OWN decrypted bot token and uses the resulting user id", async () => {
    prisma.tenant.findUnique.mockResolvedValue({ botToken: "encrypted-token" });
    initDataVerifier.verify.mockReturnValue({ id: 555, first_name: "Real Buyer" });

    await controller.checkout("tenant-1", {
      initData: "some-signed-payload",
      items: [{ productId: "p1", quantity: 1 }],
    } as any);

    expect(crypto.decrypt).toHaveBeenCalledWith("encrypted-token");
    expect(initDataVerifier.verify).toHaveBeenCalledWith(
      "some-signed-payload",
      "decrypted-bot-token",
    );
    expect(ordersService.create).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ customerTelegramId: "555" }),
    );
  });

  it("allows devTestTelegramId ONLY when NODE_ENV is not production", async () => {
    process.env.NODE_ENV = "development";

    await controller.checkout("tenant-1", {
      devTestTelegramId: "999888777",
      items: [{ productId: "p1", quantity: 1 }],
    } as any);

    expect(ordersService.create).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ customerTelegramId: "999888777" }),
    );
  });

  it("REJECTS devTestTelegramId when NODE_ENV is production — the critical production safety check", async () => {
    process.env.NODE_ENV = "production";

    await expect(
      controller.checkout("tenant-1", {
        devTestTelegramId: "999888777",
        items: [{ productId: "p1", quantity: 1 }],
      } as any),
    ).rejects.toThrow(BadRequestException);
    expect(ordersService.create).not.toHaveBeenCalled();
  });
});
