import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { HttpService } from '../http';
import { ConfigService } from '../config';
import { WebhookPayload, WebhookVerificationDto } from '../dto/webhook.dto';

describe('WebhookController', () => {
  let controller: WebhookController;
  let mockWebhookService: jest.Mocked<WebhookService>;
  let mockHttpService: jest.Mocked<HttpService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockWebhookService = {
      processWebhook: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    } as any;

    mockHttpService = {
      verifyWebhook: jest.fn().mockImplementation((mode, token, challenge) => {
        if (mode === 'subscribe' && token === 'test_token') {
          return Promise.resolve(challenge);
        }
        return Promise.reject(new Error('Verification failed'));
      }),
    } as any;

    mockConfigService = {
      webhookSecret: 'test_secret',
      metaVerifyToken: 'test_token',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
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

    controller = module.get<WebhookController>(WebhookController);

    // Mock the logger to prevent error messages during tests
    jest.spyOn(controller['logger'], 'error').mockImplementation();
    jest.spyOn(controller['logger'], 'warn').mockImplementation();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook', () => {
    it('should verify webhook successfully with valid parameters', async () => {
      const query: WebhookVerificationDto = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test_token',
        'hub.challenge': 'test_challenge',
      };

      mockHttpService.verifyWebhook.mockResolvedValue('test_challenge');

      const result = await controller.verifyWebhook(query);

      expect(result).toBe('test_challenge');
      expect(mockHttpService.verifyWebhook).toHaveBeenCalledWith(
        'subscribe',
        'test_token',
        'test_challenge',
      );
    });

    it('should throw UnauthorizedException when verification fails', async () => {
      const query: WebhookVerificationDto = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'invalid_token',
        'hub.challenge': 'test_challenge',
      };

      mockHttpService.verifyWebhook.mockRejectedValue(
        new Error('Verification failed'),
      );

      await expect(controller.verifyWebhook(query)).rejects.toThrow(
        'Webhook verification failed',
      );
    });
  });

  describe('receiveWebhook', () => {
    it('should process webhook successfully with valid payload', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'test_entry_id',
            time: 1234567890,
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+1234567890',
                    phone_number_id: 'test_phone_id',
                  },
                  statuses: [
                    {
                      id: 'test_message_id',
                      status: 'delivered',
                      timestamp: '1234567890',
                    },
                  ],
                },
                field: 'message_deliveries',
              },
            ],
          },
        ],
      };

      const signature = 'test_signature';

      mockWebhookService.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookService.processWebhook.mockResolvedValue();

      const result = await controller.receiveWebhook(payload, signature);

      expect(result).toEqual({ status: 'ok' });
      expect(mockWebhookService.verifyWebhookSignature).toHaveBeenCalledWith(
        JSON.stringify(payload),
        signature,
        'test_secret',
      );
    });

    it('should throw UnauthorizedException with invalid signature', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      const signature = 'invalid_signature';

      mockWebhookService.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        controller.receiveWebhook(payload, signature),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should throw BadRequestException with invalid payload structure', async () => {
      const invalidPayload = {
        object: 'whatsapp_business_account',
        // Missing entry array
      };

      const signature = 'test_signature';

      mockWebhookService.verifyWebhookSignature.mockReturnValue(true);

      await expect(
        controller.receiveWebhook(invalidPayload as any, signature),
      ).rejects.toThrow('Invalid webhook payload');
    });

    it('should process webhook without signature verification when signature is missing', async () => {
      const payload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      mockWebhookService.processWebhook.mockResolvedValue();

      const result = await controller.receiveWebhook(payload);

      expect(result).toEqual({ status: 'ok' });
      expect(mockWebhookService.verifyWebhookSignature).not.toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });
});
