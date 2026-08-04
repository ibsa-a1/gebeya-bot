import { IsOptional, IsEnum, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus } from "@prisma/client";

export class QueryOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}
