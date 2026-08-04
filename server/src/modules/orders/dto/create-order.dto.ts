import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

class OrderItemInput {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsObject()
  variant?: Record<string, unknown>;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerTelegramId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];
}
