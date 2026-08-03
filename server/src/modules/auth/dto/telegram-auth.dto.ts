import { IsInt, IsOptional, IsString } from "class-validator";

export class TelegramAuthDto {
  @IsInt()
  id: number;

  @IsString()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsInt()
  auth_date: number;

  @IsString()
  hash: string;
}
