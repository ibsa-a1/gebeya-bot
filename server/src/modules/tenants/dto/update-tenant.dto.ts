import { IsString, IsOptional, IsBoolean } from "class-validator";

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  botToken?: string;

  @IsOptional()
  @IsString()
  botUsername?: string;

  @IsOptional()
  @IsBoolean()
  discoverable?: boolean;

  @IsOptional()
  @IsString()
  chapaPublicKey?: string;

  @IsOptional()
  @IsString()
  chapaSecretKey?: string;
}
