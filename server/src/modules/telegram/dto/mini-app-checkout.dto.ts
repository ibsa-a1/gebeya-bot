import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
  IsObject,
  Matches,
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
  // The real, production path: Telegram's signed initData string, verified
  // server-side against the tenant's bot token — this is what a genuine
  // Mini App session inside Telegram provides automatically.
  @IsOptional()
  @IsString()
  initData?: string;

  // A DEV-ONLY escape hatch for testing outside Telegram (e.g. a plain
  // browser tab). Never trusted in production — see MiniAppController.
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: "devTestTelegramId must be numeric" })
  devTestTelegramId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemInput)
  items: CheckoutItemInput[];
}
