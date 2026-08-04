import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { QueryOrdersDto } from "./dto/query-orders.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Controller("tenants/:tenantId/orders")
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * TEMPORARY, for manual/Phase-7 testing only. Real buyers have no dashboard
   * login and no TenantMembership, so the actual buyer-facing checkout path
   * (Phase 10/12, the Mini App) will call `OrdersService.create()` directly
   * from a PUBLIC endpoint — not through this JwtAuthGuard/TenantGuard-protected
   * route. This route lets tenant staff manually test/verify order creation
   * (and the stock race-condition handling) before that public path exists.
   */
  @Post()
  create(@Param("tenantId") tenantId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(tenantId, dto);
  }

  @Get()
  findAll(@Param("tenantId") tenantId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(tenantId, query);
  }

  @Get(":orderId")
  findOne(@Param("tenantId") tenantId: string, @Param("orderId") orderId: string) {
    return this.ordersService.findOne(tenantId, orderId);
  }

  @Patch(":orderId/status")
  updateStatus(
    @Param("tenantId") tenantId: string,
    @Param("orderId") orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(tenantId, orderId, dto);
  }
}
