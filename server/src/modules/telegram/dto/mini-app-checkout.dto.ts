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

class CheckoutItemInput {
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

export class MiniAppCheckoutDto {
  @IsString()
  @IsNotEmpty()
  customerTelegramId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemInput)
  items: CheckoutItemInput[];
}
