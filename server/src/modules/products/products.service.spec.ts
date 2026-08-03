import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("ProductsService", () => {
  let service: ProductsService;
  let prisma: {
    product: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("scopes the created product to the given tenantId", async () => {
      prisma.product.create.mockResolvedValue({ id: "product-1", tenantId: "tenant-a" });

      await service.create("tenant-a", {
        name: "Jacket",
        category: "Clothing",
        price: 100,
        stock: 5,
      });

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: "tenant-a" }),
        }),
      );
    });
  });

  describe("findOne — the core tenant-isolation guarantee", () => {
    it("throws NotFoundException when the product exists but belongs to a DIFFERENT tenant", async () => {
      // Simulates exactly the real attack we tested manually: a legitimate
      // user of tenant-b trying to reach a product that actually belongs
      // to tenant-a, using tenant-b's own (valid) tenantId in the request.
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne("tenant-b", "product-belonging-to-tenant-a")).rejects.toThrow(
        NotFoundException,
      );

      // The critical assertion: the query itself must be scoped by BOTH
      // id and tenantId together — not fetched by id alone and checked after.
      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: "product-belonging-to-tenant-a", tenantId: "tenant-b" },
      });
    });

    it("throws NotFoundException for a genuinely non-existent product", async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findOne("tenant-a", "ghost-product")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns the product when it genuinely belongs to the requesting tenant", async () => {
      const product = { id: "product-1", tenantId: "tenant-a", name: "Jacket" };
      prisma.product.findFirst.mockResolvedValue(product);

      const result = await service.findOne("tenant-a", "product-1");
      expect(result).toEqual(product);
    });
  });

  describe("update", () => {
    it("refuses to update a product belonging to a different tenant", async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.update("tenant-b", "product-belonging-to-tenant-a", { name: "Hacked" }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("refuses to delete a product belonging to a different tenant", async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.remove("tenant-b", "product-belonging-to-tenant-a")).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });
});
