import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductsDto } from "./dto/query-products.dto";

const PAGE_SIZE = 20;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        price: dto.price,
        stock: dto.stock,
        images: dto.images ?? [],
        variants: dto.variants,
      },
    });
  }

  async findAll(tenantId: string, query: QueryProductsDto) {
    const page = query.page ?? 1;

    const where = {
      tenantId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page };
  }

  async findOne(tenantId: string, productId: string) {
    // Scoping by BOTH id and tenantId in the same query is the actual
    // enforcement point here — not an afterthought check post-fetch.
    // A product belonging to a different tenant simply doesn't match
    // this WHERE clause and comes back as not-found, not forbidden —
    // which also avoids leaking whether the id exists at all elsewhere.
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async update(tenantId: string, productId: string, dto: UpdateProductDto) {
    await this.findOne(tenantId, productId); // throws NotFoundException if not this tenant's product

    return this.prisma.product.update({
      where: { id: productId },
      data: dto,
    });
  }

  async remove(tenantId: string, productId: string) {
    await this.findOne(tenantId, productId);
    await this.prisma.product.delete({ where: { id: productId } });
  }
}
