import { plainToInstance } from "class-transformer";
import { IsString, IsNotEmpty, IsNumberString, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  PLATFORM_AUTH_BOT_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  ENCRYPTION_KEY: string;

  @IsNumberString()
  PORT: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(", "))
      .join("; ");
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validatedConfig;
}
