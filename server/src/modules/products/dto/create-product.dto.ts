import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, Min, IsArray } from "class-validator";
import { Prisma } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  variants?: Prisma.InputJsonValue;
}
