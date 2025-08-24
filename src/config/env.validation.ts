import { plainToClass } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  APP_NAME: string;

  @IsString()
  META_ACCESS_TOKEN: string;

  @IsString()
  META_APP_ID: string;

  @IsString()
  META_APP_SECRET: string;

  @IsString()
  META_PHONE_NUMBER_ID: string;

  @IsString()
  META_VERIFY_TOKEN: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsNumber()
  REDIS_DB?: number;

  @IsOptional()
  @IsNumber()
  QUEUE_DEFAULT_JOB_ATTEMPTS?: number;

  @IsOptional()
  @IsNumber()
  QUEUE_DEFAULT_JOB_DELAY?: number;

  @IsOptional()
  @IsNumber()
  QUEUE_DEFAULT_JOB_BACKOFF_DELAY?: number;

  @IsString()
  LOG_LEVEL: string;

  @IsString()
  LOG_FORMAT: string;

  @IsNumber()
  RATE_LIMIT_TTL: number;

  @IsNumber()
  RATE_LIMIT_LIMIT: number;

  @IsString()
  WEBHOOK_URL: string;

  @IsString()
  WEBHOOK_SECRET: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
