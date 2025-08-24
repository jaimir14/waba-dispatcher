import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let mockNestConfigService: jest.Mocked<NestConfigService>;

  beforeEach(async () => {
    mockNestConfigService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: NestConfigService,
          useValue: mockNestConfigService,
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  const setupMock = (key: string, value: any) => {
    mockNestConfigService.get.mockImplementation((configKey: string) => {
      if (configKey === key) return value;
      return undefined;
    });
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Application Configuration', () => {
    it('should return node environment', () => {
      setupMock('NODE_ENV', 'development');
      expect(service.nodeEnv).toBe('development');
    });

    it('should return port', () => {
      setupMock('PORT', 3000);
      expect(service.port).toBe(3000);
    });

    it('should return app name', () => {
      setupMock('APP_NAME', 'waba-dispatcher');
      expect(service.appName).toBe('waba-dispatcher');
    });
  });

  describe('Meta WhatsApp Business API Configuration', () => {
    it('should return meta access token', () => {
      setupMock('META_ACCESS_TOKEN', 'test_token');
      expect(service.metaAccessToken).toBe('test_token');
    });

    it('should return meta app id', () => {
      setupMock('META_APP_ID', 'test_app_id');
      expect(service.metaAppId).toBe('test_app_id');
    });

    it('should return meta app secret', () => {
      setupMock('META_APP_SECRET', 'test_app_secret');
      expect(service.metaAppSecret).toBe('test_app_secret');
    });

    it('should return meta phone number id', () => {
      setupMock('META_PHONE_NUMBER_ID', 'test_phone_id');
      expect(service.metaPhoneNumberId).toBe('test_phone_id');
    });

    it('should return meta verify token', () => {
      setupMock('META_VERIFY_TOKEN', 'test_verify_token');
      expect(service.metaVerifyToken).toBe('test_verify_token');
    });
  });

  describe('Redis Configuration', () => {
    it('should return redis host', () => {
      setupMock('REDIS_HOST', 'localhost');
      expect(service.redisHost).toBe('localhost');
    });

    it('should return redis port', () => {
      setupMock('REDIS_PORT', 6379);
      expect(service.redisPort).toBe(6379);
    });

    it('should return redis password', () => {
      setupMock('REDIS_PASSWORD', undefined);
      expect(service.redisPassword).toBeUndefined();
    });

    it('should return redis db', () => {
      setupMock('REDIS_DB', 0);
      expect(service.redisDb).toBe(0);
    });
  });

  describe('Database Configuration', () => {
    it('should return database host', () => {
      setupMock('DB_HOST', 'localhost');
      expect(service.databaseHost).toBe('localhost');
    });

    it('should return database port', () => {
      setupMock('DB_PORT', 3306);
      expect(service.databasePort).toBe(3306);
    });

    it('should return database username', () => {
      setupMock('DB_USERNAME', 'test');
      expect(service.databaseUsername).toBe('test');
    });

    it('should return database password', () => {
      setupMock('DB_PASSWORD', 'test');
      expect(service.databasePassword).toBe('test');
    });

    it('should return database name', () => {
      setupMock('DB_NAME', 'test');
      expect(service.databaseName).toBe('test');
    });
  });

  describe('Logging Configuration', () => {
    it('should return log level', () => {
      setupMock('LOG_LEVEL', 'info');
      expect(service.logLevel).toBe('info');
    });

    it('should return log format', () => {
      setupMock('LOG_FORMAT', 'json');
      expect(service.logFormat).toBe('json');
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should return rate limit ttl', () => {
      setupMock('RATE_LIMIT_TTL', 60);
      expect(service.rateLimitTtl).toBe(60);
    });

    it('should return rate limit limit', () => {
      setupMock('RATE_LIMIT_LIMIT', 100);
      expect(service.rateLimitLimit).toBe(100);
    });
  });

  describe('Webhook Configuration', () => {
    it('should return webhook url', () => {
      setupMock('WEBHOOK_URL', 'https://test.com/webhook');
      expect(service.webhookUrl).toBe('https://test.com/webhook');
    });

    it('should return webhook secret', () => {
      setupMock('WEBHOOK_SECRET', 'test_secret');
      expect(service.webhookSecret).toBe('test_secret');
    });
  });

  describe('Environment Helper Methods', () => {
    it('should return true for isDevelopment when NODE_ENV is development', () => {
      setupMock('NODE_ENV', 'development');
      expect(service.isDevelopment).toBe(true);
    });

    it('should return false for isProduction when NODE_ENV is development', () => {
      setupMock('NODE_ENV', 'development');
      expect(service.isProduction).toBe(false);
    });

    it('should return false for isTest when NODE_ENV is development', () => {
      setupMock('NODE_ENV', 'development');
      expect(service.isTest).toBe(false);
    });
  });
});
