import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../auth/crypto/crypto.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async create(dto: CreateTenantDto) {
    const existingSlug = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) {
      throw new ConflictException("A tenant with this slug already exists");
    }

    const owner = await this.prisma.user.findUnique({ where: { email: dto.ownerEmail } });
    if (!owner) {
      throw new BadRequestException(
        `No existing user found with email ${dto.ownerEmail} — the owner account must already exist before creating their tenant`,
      );
    }

    const encryptedBotToken = this.crypto.encrypt(dto.botToken);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        botToken: encryptedBotToken,
        botUsername: dto.botUsername,
        currency: dto.currency ?? "ETB",
        memberships: {
          create: { userId: owner.id, role: "OWNER" },
        },
      },
    });

    return this.toSafeTenant(tenant);
  }

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }
    return this.toSafeTenant(tenant);
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.discoverable !== undefined) data.discoverable = dto.discoverable;
    if (dto.chapaPublicKey !== undefined) data.chapaPublicKey = dto.chapaPublicKey;
    if (dto.chapaSecretKey !== undefined) {
      data.chapaSecretKey = this.crypto.encrypt(dto.chapaSecretKey);
    }

    const updated = await this.prisma.tenant.update({ where: { id: tenantId }, data });
    return this.toSafeTenant(updated);
  }

  /**
   * Never return botToken, chapaSecretKey (even encrypted) in any API response.
   * Only an internal decrypt (e.g. the Telegram module dispatching to the real
   * bot) should ever call CryptoService.decrypt on these fields directly from
   * the database — never through this service's public return values.
   */
  private toSafeTenant(tenant: {
    id: string;
    name: string;
    slug: string;
    botUsername: string;
    currency: string;
    discoverable: boolean;
    chapaPublicKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      botUsername: tenant.botUsername,
      currency: tenant.currency,
      discoverable: tenant.discoverable,
      chapaPublicKey: tenant.chapaPublicKey,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
