import { IsString, IsNotEmpty } from "class-validator";

export class InitializePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
