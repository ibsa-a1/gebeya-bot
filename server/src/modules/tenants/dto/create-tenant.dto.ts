import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches } from "class-validator";

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  botToken: string;

  @IsString()
  @IsNotEmpty()
  botUsername: string;

  @IsEmail()
  ownerEmail: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
