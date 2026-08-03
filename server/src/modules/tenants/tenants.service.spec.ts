import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, BadRequestException, NotFoundException } from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";

describe("TenantsService", () => {
  let service: TenantsService;
  let prisma: {
    tenant: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let crypto: { encrypt: jest.Mock; decrypt: jest.Mock };

  beforeEach(async () => {
    prisma = {
      tenant: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    crypto = {
      encrypt: jest.fn((val: string) => `encrypted(${val})`),
      decrypt: jest.fn((val: string) => val.replace(/^encrypted\((.*)\)$/, "$1")),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: crypto },
      ],
    }).compile();

    service = module.get(TenantsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("throws ConflictException if the slug is already taken", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: "existing-tenant" });

      await expect(
        service.create({
          name: "Shop",
          slug: "taken-slug",
          botToken: "tok",
          botUsername: "bot",
          ownerEmail: "owner@example.com",
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("throws BadRequestException if the owner email does not belong to an existing user", async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          name: "Shop",
          slug: "free-slug",
          botToken: "tok",
          botUsername: "bot",
          ownerEmail: "ghost@example.com",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });

    it("encrypts the bot token before saving and never returns it", async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: "owner-id" });
      prisma.tenant.create.mockResolvedValue({
        id: "tenant-1",
        name: "Shop",
        slug: "free-slug",
        botUsername: "bot",
        currency: "ETB",
        discoverable: true,
        chapaPublicKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        name: "Shop",
        slug: "free-slug",
        botToken: "REAL_SECRET_TOKEN",
        botUsername: "bot",
        ownerEmail: "owner@example.com",
      });

      expect(crypto.encrypt).toHaveBeenCalledWith("REAL_SECRET_TOKEN");
      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            botToken: "encrypted(REAL_SECRET_TOKEN)",
            memberships: { create: { userId: "owner-id", role: "OWNER" } },
          }),
        }),
      );
      // The critical assertion: the raw or encrypted botToken must NEVER appear
      // in what gets returned to an API caller.
      expect(result).not.toHaveProperty("botToken");
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException for a non-existent tenant", async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing-id")).rejects.toThrow(NotFoundException);
    });

    it("never includes botToken or chapaSecretKey in the returned shape", async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: "tenant-1",
        name: "Shop",
        slug: "shop",
        botToken: "encrypted(secret)",
        botUsername: "bot",
        currency: "ETB",
        discoverable: true,
        chapaPublicKey: "pub-key",
        chapaSecretKey: "encrypted(chapa-secret)",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findOne("tenant-1");

      expect(result).not.toHaveProperty("botToken");
      expect(result).not.toHaveProperty("chapaSecretKey");
      expect(result.chapaPublicKey).toBe("pub-key");
    });
  });

  describe("update", () => {
    it("encrypts a new chapaSecretKey when updating", async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1" });
      prisma.tenant.update.mockResolvedValue({
        id: "tenant-1",
        name: "Shop",
        slug: "shop",
        botUsername: "bot",
        currency: "ETB",
        discoverable: true,
        chapaPublicKey: "pub-key",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update("tenant-1", { chapaSecretKey: "NEW_SECRET" });

      expect(crypto.encrypt).toHaveBeenCalledWith("NEW_SECRET");
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        data: { chapaSecretKey: "encrypted(NEW_SECRET)" },
      });
    });
  });
});
