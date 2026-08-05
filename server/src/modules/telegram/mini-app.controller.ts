import { Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import { ProductsService } from "../products/products.service";
import { OrdersService } from "../orders/orders.service";
import { QueryProductsDto } from "../products/dto/query-products.dto";
import { MiniAppCheckoutDto } from "./dto/mini-app-checkout.dto";

// Deliberately NO auth guards — buyers have no dashboard login, only a
// Telegram identity. This is the real production checkout path referenced
// (but not yet built) back in API.md's Orders section note.
@Controller("mini-app/tenants/:tenantId")
export class MiniAppController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get("products")
  getProducts(@Param("tenantId") tenantId: string, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(tenantId, query);
  }

  @Post("checkout")
  checkout(@Param("tenantId") tenantId: string, @Body() dto: MiniAppCheckoutDto) {
    return this.ordersService.create(tenantId, dto);
  }
}
