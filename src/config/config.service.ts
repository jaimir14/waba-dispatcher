import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV');
  }

  get port(): number {
    return this.configService.get<number>('PORT');
  }

  get appName(): string {
    return this.configService.get<string>('APP_NAME');
  }

  // Meta WhatsApp Business API Configuration
  get metaAccessToken(): string {
    return this.configService.get<string>('META_ACCESS_TOKEN');
  }

  get metaAppId(): string {
    return this.configService.get<string>('META_APP_ID');
  }

  get metaAppSecret(): string {
    return this.configService.get<string>('META_APP_SECRET');
  }

  get metaPhoneNumberId(): string {
    return this.configService.get<string>('META_PHONE_NUMBER_ID');
  }

  get metaVerifyToken(): string {
    return this.configService.get<string>('META_VERIFY_TOKEN');
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST');
  }

  get redisPort(): number {
    return this.configService.get<number>('REDIS_PORT');
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('REDIS_PASSWORD');
  }

  get redisDb(): number {
    return this.configService.get<number>('REDIS_DB', 0);
  }

  get queueDefaultJobAttempts(): number {
    return this.configService.get<number>('QUEUE_DEFAULT_JOB_ATTEMPTS', 3);
  }

  get queueDefaultJobDelay(): number {
    return this.configService.get<number>('QUEUE_DEFAULT_JOB_DELAY', 0);
  }

  get queueDefaultJobBackoffDelay(): number {
    return this.configService.get<number>(
      'QUEUE_DEFAULT_JOB_BACKOFF_DELAY',
      5000,
    );
  }

  // Logging Configuration
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL');
  }

  get logFormat(): string {
    return this.configService.get<string>('LOG_FORMAT');
  }

  // Rate Limiting Configuration
  get rateLimitTtl(): number {
    return this.configService.get<number>('RATE_LIMIT_TTL');
  }

  get rateLimitLimit(): number {
    return this.configService.get<number>('RATE_LIMIT_LIMIT');
  }

  // Webhook Configuration
  get webhookUrl(): string {
    return this.configService.get<string>('WEBHOOK_URL');
  }

  get webhookSecret(): string {
    return this.configService.get<string>('WEBHOOK_SECRET');
  }

  // Helper methods
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  // Add these methods to your existing ConfigService
  get databaseHost(): string {
    return this.configService.get<string>('DB_HOST') || 'localhost';
  }

  get databasePort(): number {
    return this.configService.get<number>('DB_PORT') || 3306;
  }

  get databaseUsername(): string {
    return this.configService.get<string>('DB_USERNAME') || 'root';
  }

  get databasePassword(): string {
    return this.configService.get<string>('DB_PASSWORD') || '';
  }

  get databaseName(): string {
    return this.configService.get<string>('DB_NAME') || 'waba_dispatcher';
  }

  // WhatsApp Pricing Configuration
  get whatsappCostPerMessage(): number {
    return this.configService.get<number>('WHATSAPP_COST_PER_MESSAGE', 0.08);
  }

  get whatsappCurrency(): string {
    return this.configService.get<string>('WHATSAPP_CURRENCY', 'USD');
  }
}
