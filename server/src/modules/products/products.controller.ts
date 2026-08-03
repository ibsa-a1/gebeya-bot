import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductsDto } from "./dto/query-products.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Controller("tenants/:tenantId/products")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Param("tenantId") tenantId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, dto);
  }

  @Get()
  findAll(@Param("tenantId") tenantId: string, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(tenantId, query);
  }

  @Get(":productId")
  findOne(@Param("tenantId") tenantId: string, @Param("productId") productId: string) {
    return this.productsService.findOne(tenantId, productId);
  }

  @Patch(":productId")
  update(
    @Param("tenantId") tenantId: string,
    @Param("productId") productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, productId, dto);
  }

  @Delete(":productId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("tenantId") tenantId: string, @Param("productId") productId: string) {
    await this.productsService.remove(tenantId, productId);
  }
}
