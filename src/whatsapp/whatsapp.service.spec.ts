import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './whatsapp.service';
import { ConfigService } from '../config/config.service';
import { HttpService } from '../http/http.service';
import { MessageRepository } from '../database/repositories/message.repository';
import { CompanyRepository } from '../database/repositories/company.repository';
import { Message, MessageStatus } from '../database/models/message.model';
import { Company } from '../database/models/company.model';
import { SendMessageDto } from '../dto';
import { QueueService } from '../queue/queue.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockHttpService: jest.Mocked<HttpService>;
  let mockMessageRepository: jest.Mocked<MessageRepository>;
  let mockCompanyRepository: jest.Mocked<CompanyRepository>;
  let mockQueueService: jest.Mocked<QueueService>;

  const mockCompany: Partial<Company> = {
    id: 'test-company-id',
    name: 'Test Company',
    apiKey: 'test_api_key',
    isActive: true,
    settings: {
      metaPhoneNumberId: 'test_phone_id',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage: Partial<Message> = {
    id: 1,
    company_id: 'test-company-id',
    to_phone_number: '+50683186803',
    template_name: 'inicio_conversacion',
    parameters: [{ type: 'text', text: 'Alfredo Alvarado' }],
    status: MessageStatus.PENDING,
    whatsapp_message_id: null,
    error_code: null,
    error_message: null,
    pricing: null,
    sent_at: null,
    delivered_at: null,
    read_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockConfigService = {
      metaPhoneNumberId: 'test_phone_id',
    } as any;

    mockHttpService = {
      sendMessage: jest.fn(),
    } as any;

    mockMessageRepository = {
      create: jest.fn(),
      updateWhatsAppId: jest.fn(),
      updateStatus: jest.fn(),
      markAsFailed: jest.fn(),
    } as any;

    mockCompanyRepository = {
      findById: jest.fn(),
    } as any;

    mockQueueService = {
      addWhatsAppSendJob: jest.fn(),
      addBulkWhatsAppSendJobs: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: MessageRepository,
          useValue: mockMessageRepository,
        },
        {
          provide: CompanyRepository,
          useValue: mockCompanyRepository,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);

    // Mock logger to prevent error messages during tests
    jest.spyOn(service['logger'], 'error').mockImplementation();
    jest.spyOn(service['logger'], 'log').mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessageToMultipleRecipients', () => {
    const sendMessageDto: SendMessageDto = {
      templateName: 'inicio_conversacion',
      language: 'es',
      parameters: ['Alfredo Alvarado'],
      recipients: ['+50683186803', '+50688888888'],
    };

    beforeEach(() => {
      mockCompanyRepository.findById.mockResolvedValue(mockCompany as Company);
      mockMessageRepository.create.mockResolvedValue(mockMessage as Message);
      mockHttpService.sendMessage.mockResolvedValue({
        data: {
          messages: [{ id: 'whatsapp_message_id_123' }],
        },
      } as any);
    });

    it('should send messages to multiple recipients successfully', async () => {
      const result = await service.sendMessageToMultipleRecipients(
        'test-company-id',
        sendMessageDto,
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Sent to 2/2 recipients');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].recipient).toBe('+50683186803');
      expect(result.results[0].status).toBe('sent');
      expect(result.results[1].recipient).toBe('+50688888888');
      expect(result.results[1].status).toBe('sent');

      // Verify that sendTemplateMessage was called for each recipient
      expect(mockCompanyRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockMessageRepository.create).toHaveBeenCalledTimes(2);
      expect(mockHttpService.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      // Mock the second call to fail
      mockHttpService.sendMessage
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'whatsapp_message_id_123' }],
          },
        } as any)
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await service.sendMessageToMultipleRecipients(
        'test-company-id',
        sendMessageDto,
      );

      expect(result.status).toBe('partial');
      expect(result.message).toBe('Sent to 1/2 recipients');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('sent');
      expect(result.results[1].status).toBe('failed');
      expect(result.results[1].error).toBe('Network error');
    });

    it('should handle complete failure', async () => {
      mockHttpService.sendMessage.mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await service.sendMessageToMultipleRecipients(
        'test-company-id',
        sendMessageDto,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toBe('Sent to 0/2 recipients');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('failed');
      expect(result.results[1].status).toBe('failed');
    });

    it('should handle single recipient', async () => {
      const singleRecipientDto: SendMessageDto = {
        ...sendMessageDto,
        recipients: ['+50683186803'],
      };

      const result = await service.sendMessageToMultipleRecipients(
        'test-company-id',
        singleRecipientDto,
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Sent to 1/1 recipients');
      expect(result.results).toHaveLength(1);
      expect(mockHttpService.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle empty parameters', async () => {
      const noParamsDto: SendMessageDto = {
        templateName: 'simple_template',
        language: 'es',
        recipients: ['+50683186803'],
      };

      const result = await service.sendMessageToMultipleRecipients(
        'test-company-id',
        noParamsDto,
      );

      expect(result.status).toBe('success');
      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          template_name: 'simple_template',
          parameters: [],
        }),
      );
    });

    it('should create correct CreateTemplateMessageDto for each recipient', async () => {
      await service.sendMessageToMultipleRecipients(
        'test-company-id',
        sendMessageDto,
      );

      // Verify the first call
      expect(mockMessageRepository.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          company_id: 'test-company-id',
          to_phone_number: '+50683186803',
          template_name: 'inicio_conversacion',
          status: MessageStatus.PENDING,
        }),
      );

      // Verify the second call
      expect(mockMessageRepository.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          company_id: 'test-company-id',
          to_phone_number: '+50688888888',
          template_name: 'inicio_conversacion',
          status: MessageStatus.PENDING,
        }),
      );
    });
  });

  describe('sendMessageToMultipleRecipientsQueued', () => {
    const sendMessageDto: SendMessageDto = {
      templateName: 'inicio_conversacion',
      language: 'es',
      parameters: ['Alfredo Alvarado'],
      recipients: ['+50683186803', '+50688888888'],
    };

    it('should queue messages to multiple recipients successfully', async () => {
      mockQueueService.addWhatsAppSendJob.mockResolvedValue();

      const result = await service.sendMessageToMultipleRecipientsQueued(
        'test-company-id',
        sendMessageDto,
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Queued 2/2 recipients');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].recipient).toBe('+50683186803');
      expect(result.results[0].status).toBe('sent');
      expect(result.results[0].messageId).toBe('queued');
      expect(result.results[1].recipient).toBe('+50688888888');
      expect(result.results[1].status).toBe('sent');
      expect(result.results[1].messageId).toBe('queued');

      expect(mockQueueService.addWhatsAppSendJob).toHaveBeenCalledTimes(2);
      expect(mockQueueService.addWhatsAppSendJob).toHaveBeenNthCalledWith(1, {
        companyId: 'test-company-id',
        to: '+50683186803',
        templateName: 'inicio_conversacion',
        parameters: ['Alfredo Alvarado'],
        priority: 0,
      });
      expect(mockQueueService.addWhatsAppSendJob).toHaveBeenNthCalledWith(2, {
        companyId: 'test-company-id',
        to: '+50688888888',
        templateName: 'inicio_conversacion',
        parameters: ['Alfredo Alvarado'],
        priority: 0,
      });
    });

    it('should handle partial queue failures', async () => {
      mockQueueService.addWhatsAppSendJob
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Queue error'));

      const result = await service.sendMessageToMultipleRecipientsQueued(
        'test-company-id',
        sendMessageDto,
      );

      expect(result.status).toBe('partial');
      expect(result.message).toBe('Queued 1/2 recipients');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('sent');
      expect(result.results[1].status).toBe('failed');
      expect(result.results[1].error).toBe('Queue error');
    });

    it('should handle high priority jobs', async () => {
      mockQueueService.addWhatsAppSendJob.mockResolvedValue();

      const result = await service.sendMessageToMultipleRecipientsQueued(
        'test-company-id',
        sendMessageDto,
        1, // High priority
      );

      expect(result.status).toBe('success');
      expect(mockQueueService.addWhatsAppSendJob).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 1,
        }),
      );
    });
  });

  describe('sendMessageToMultipleRecipientsBulkQueued', () => {
    const sendMessageDto: SendMessageDto = {
      templateName: 'inicio_conversacion',
      language: 'es',
      parameters: ['Alfredo Alvarado'],
      recipients: ['+50683186803', '+50688888888'],
    };

    it('should bulk queue messages to multiple recipients successfully', async () => {
      mockQueueService.addBulkWhatsAppSendJobs.mockResolvedValue();

      const result = await service.sendMessageToMultipleRecipientsBulkQueued(
        'test-company-id',
        sendMessageDto,
      );

      expect(result.status).toBe('success');
      expect(result.message).toBe('Bulk queued 2/2 recipients');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].recipient).toBe('+50683186803');
      expect(result.results[0].status).toBe('sent');
      expect(result.results[0].messageId).toBe('queued');

      expect(mockQueueService.addBulkWhatsAppSendJobs).toHaveBeenCalledWith([
        {
          data: {
            companyId: 'test-company-id',
            to: '+50683186803',
            templateName: 'inicio_conversacion',
            parameters: ['Alfredo Alvarado'],
            priority: 0,
          },
        },
        {
          data: {
            companyId: 'test-company-id',
            to: '+50688888888',
            templateName: 'inicio_conversacion',
            parameters: ['Alfredo Alvarado'],
            priority: 0,
          },
        },
      ]);
    });

    it('should handle bulk queue failure', async () => {
      mockQueueService.addBulkWhatsAppSendJobs.mockRejectedValue(
        new Error('Bulk queue error'),
      );

      const result = await service.sendMessageToMultipleRecipientsBulkQueued(
        'test-company-id',
        sendMessageDto,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toBe('Failed to queue 0/2 recipients');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].error).toBe('Failed to queue message');
    });
  });
});
