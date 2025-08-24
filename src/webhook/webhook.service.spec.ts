import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { MessageRepository } from '../database/repositories/message.repository';
import { MessageStatus } from '../database/models/message.model';
import {
  WebhookPayload,
  WebhookEntryChangeValueStatus,
} from '../dto/webhook.dto';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockMessageRepository: jest.Mocked<MessageRepository>;

  beforeEach(async () => {
    mockMessageRepository = {
      findByWhatsAppId: jest.fn(),
      updateStatus: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: MessageRepository,
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);

    // Mock the logger to prevent log messages during tests
    jest.spyOn(service['logger'], 'log').mockImplementation();
    jest.spyOn(service['logger'], 'warn').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhook', () => {
    it('should process webhook payload with entries', async () => {
      const mockPayload: WebhookPayload = {
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

      mockMessageRepository.findByWhatsAppId.mockResolvedValue({
        id: 1,
        whatsapp_message_id: 'test_message_id',
        status: MessageStatus.SENT,
      } as any);

      mockMessageRepository.updateStatus.mockResolvedValue([1, []] as any);

      await service.processWebhook(mockPayload);

      expect(mockMessageRepository.findByWhatsAppId).toHaveBeenCalledWith(
        'test_message_id',
      );
      expect(mockMessageRepository.updateStatus).toHaveBeenCalledWith(
        1,
        MessageStatus.DELIVERED,
        expect.any(Object),
      );
    });

    it('should handle webhook payload with no entries', async () => {
      const mockPayload: WebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      };

      await service.processWebhook(mockPayload);

      expect(mockMessageRepository.findByWhatsAppId).not.toHaveBeenCalled();
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status to delivered', async () => {
      const mockStatus: WebhookEntryChangeValueStatus = {
        id: 'test_message_id',
        status: 'delivered',
        timestamp: '1234567890',
      };

      mockMessageRepository.findByWhatsAppId.mockResolvedValue({
        id: 1,
        whatsapp_message_id: 'test_message_id',
        status: MessageStatus.SENT,
      } as any);

      mockMessageRepository.updateStatus.mockResolvedValue([1, []] as any);

      // Use reflection to access private method for testing
      const updateMessageStatus = (service as any).updateMessageStatus.bind(
        service,
      );
      await updateMessageStatus(mockStatus);

      expect(mockMessageRepository.updateStatus).toHaveBeenCalledWith(
        1,
        MessageStatus.DELIVERED,
        {},
      );
    });

    it('should update message status to failed with error data', async () => {
      const mockStatus: WebhookEntryChangeValueStatus = {
        id: 'test_message_id',
        status: 'failed',
        timestamp: '1234567890',
        error: {
          code: 123,
          title: 'Test Error',
          message: 'Test error message',
          error_data: { test: 'data' },
        },
      };

      mockMessageRepository.findByWhatsAppId.mockResolvedValue({
        id: 1,
        whatsapp_message_id: 'test_message_id',
        status: MessageStatus.SENT,
      } as any);

      mockMessageRepository.updateStatus.mockResolvedValue([1, []] as any);

      const updateMessageStatus = (service as any).updateMessageStatus.bind(
        service,
      );
      await updateMessageStatus(mockStatus);

      expect(mockMessageRepository.updateStatus).toHaveBeenCalledWith(
        1,
        MessageStatus.FAILED,
        {
          error_code: 123,
          error_message: 'Test error message',
          error_data: { test: 'data' },
        },
      );
    });

    it('should handle message not found in database', async () => {
      const mockStatus: WebhookEntryChangeValueStatus = {
        id: 'test_message_id',
        status: 'delivered',
        timestamp: '1234567890',
      };

      mockMessageRepository.findByWhatsAppId.mockResolvedValue(null);

      const updateMessageStatus = (service as any).updateMessageStatus.bind(
        service,
      );
      await updateMessageStatus(mockStatus);

      expect(mockMessageRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true when signature is present', () => {
      const result = service.verifyWebhookSignature(
        'test_body',
        'test_signature',
        'test_secret',
      );

      expect(result).toBe(true);
    });

    it('should return false when signature is not present', () => {
      const result = service.verifyWebhookSignature(
        'test_body',
        '',
        'test_secret',
      );

      expect(result).toBe(false);
    });
  });
});
