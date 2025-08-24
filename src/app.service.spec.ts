import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { HttpService } from './http';
import { ConfigService } from './config';

describe('AppService', () => {
  let service: AppService;
  let mockHttpService: jest.Mocked<HttpService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      sendMessage: jest.fn(),
      getMessageStatus: jest.fn(),
      verifyWebhook: jest.fn(),
    } as any;

    mockConfigService = {
      metaAccessToken: 'test_access_token',
      metaPhoneNumberId: 'test_phone_number_id',
      metaAppId: 'test_app_id',
      metaAppSecret: 'test_app_secret',
      metaVerifyToken: 'test_verify_token',
      nodeEnv: 'test',
      port: 3000,
      appName: 'test-app',
      redisHost: 'localhost',
      redisPort: 6379,
      redisPassword: undefined,
      redisDb: 0,
      queueDefaultJobAttempts: 3,
      queueDefaultJobDelay: 0,
      queueDefaultJobBackoffDelay: 5000,
      logLevel: 'info',
      logFormat: 'json',
      rateLimitTtl: 60000,
      rateLimitLimit: 100,
      webhookUrl: 'http://localhost:3000/webhook',
      webhookSecret: 'test_webhook_secret',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(service.getHello()).toBe('Hello World!');
    });
  });

  describe('getHealth', () => {
    it('should return health status with timestamp', () => {
      const result = service.getHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('testWhatsAppConnection', () => {
    it('should return success status when WhatsApp API is accessible', async () => {
      // Mock successful API response
      mockHttpService.get.mockResolvedValue({
        data: {
          id: 'test_phone_number_id',
          name: 'Test Phone Number',
          code_verification_status: 'VERIFIED',
          quality_rating: {
            quality_score: 'GREEN',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.testWhatsAppConnection();

      expect(result.status).toBe('success');
      expect(result.message).toContain('WhatsApp API connection successful');
      expect(result.message).toContain('Phone number verified');
      expect(mockHttpService.get).toHaveBeenCalledWith('/test_phone_number_id', {
        params: {
          access_token: 'test_access_token',
          fields: 'id,name,code_verification_status,quality_rating',
        },
      });
    });

    it('should return error status when configuration is missing', async () => {
      // Create a new module with missing configuration
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          AppService,
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
          {
            provide: ConfigService,
            useValue: {
              ...mockConfigService,
              metaAccessToken: '',
              metaPhoneNumberId: '',
            } as any,
          },
        ],
      }).compile();

      const serviceWithMissingConfig = moduleWithMissingConfig.get<AppService>(AppService);
      const result = await serviceWithMissingConfig.testWhatsAppConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Configuration error');
      expect(result.message).toContain('META_ACCESS_TOKEN');
      expect(result.message).toContain('META_PHONE_NUMBER_ID');
    });

    it('should return error status when API returns 401', async () => {
      // Mock 401 Unauthorized response
      const error: any = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: {
          error: {
            message: 'Invalid access token',
            code: 190,
          },
        },
      };

      mockHttpService.get.mockRejectedValue(error);

      const result = await service.testWhatsAppConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid access token');
      expect(result.message).toContain('META_ACCESS_TOKEN');
    });

    it('should return error status when API returns 404', async () => {
      // Mock 404 Not Found response
      const error: any = new Error('Not Found');
      error.response = {
        status: 404,
        data: {
          error: {
            message: 'Phone number ID not found',
            code: 100,
          },
        },
      };

      mockHttpService.get.mockRejectedValue(error);

      const result = await service.testWhatsAppConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Phone number ID not found');
      expect(result.message).toContain('META_PHONE_NUMBER_ID');
    });

    it('should return error status when network error occurs', async () => {
      // Mock network error
      const error: any = new Error('Network Error');
      error.code = 'ECONNREFUSED';

      mockHttpService.get.mockRejectedValue(error);

      const result = await service.testWhatsAppConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Connection refused: Check network connectivity');
    });

    it('should return error status when API response is invalid', async () => {
      // Mock invalid response structure
      mockHttpService.get.mockResolvedValue({
        data: {}, // Missing required fields
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.testWhatsAppConnection();

      expect(result.status).toBe('error');
      expect(result.message).toContain('Failed to connect to WhatsApp API');
    });
  });
});
