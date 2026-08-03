import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { PlatformOwnerGuard } from "../auth/guards/platform-owner.guard";

@Controller("tenants")
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @UseGuards(PlatformOwnerGuard)
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get(":tenantId")
  @UseGuards(TenantGuard)
  findOne(@Param("tenantId") tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Patch(":tenantId")
  @UseGuards(TenantGuard)
  update(@Param("tenantId") tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(tenantId, dto);
  }
}
