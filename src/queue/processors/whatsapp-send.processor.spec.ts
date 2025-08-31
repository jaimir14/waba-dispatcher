import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppSendProcessor } from './whatsapp-send.processor';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { WhatsAppSendJobData } from '../queue.service';
import { Job } from 'bull';
import { Message } from '../../database/models/message.model';

describe('WhatsAppSendProcessor', () => {
  let processor: WhatsAppSendProcessor;
  let mockWhatsAppService: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    mockWhatsAppService = {
      sendTemplateMessage: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppSendProcessor,
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
      ],
    }).compile();

    processor = module.get<WhatsAppSendProcessor>(WhatsAppSendProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleSendWhatsAppMessage', () => {
    const jobData: WhatsAppSendJobData = {
      companyId: 'test-company',
      to: '+50688776655',
      templateName: 'test_template',
      parameters: ['param1', 'param2'],
    };

    const mockJob: Partial<Job<WhatsAppSendJobData>> = {
      id: 'job-123',
      data: jobData,
    };

    const mockMessage: Partial<Message> = {
      id: 1,
      whatsapp_message_id: 'wa_msg_123',
    };

    it('should process WhatsApp send job successfully', async () => {
      mockWhatsAppService.sendTemplateMessage.mockResolvedValue(
        mockMessage as Message,
      );

      const result = await processor.handleSendWhatsAppMessage(
        mockJob as Job<WhatsAppSendJobData>,
      );

      expect(mockWhatsAppService.sendTemplateMessage).toHaveBeenCalledWith(
        'test-company',
        expect.objectContaining({
          to: '+50688776655',
          template_name: 'test_template',
          parameters: expect.arrayContaining([
            expect.objectContaining({ text: 'param1' }),
            expect.objectContaining({ text: 'param2' }),
          ]),
        }),
      );

      expect(result).toEqual({
        success: true,
        messageId: 1,
        recipient: '+50688776655',
        templateName: 'test_template',
      });
    });

    it('should handle job without parameters', async () => {
      const jobDataWithoutParams = {
        ...jobData,
        parameters: undefined,
      };
      const jobWithoutParams = {
        ...mockJob,
        data: jobDataWithoutParams,
      };

      mockWhatsAppService.sendTemplateMessage.mockResolvedValue(
        mockMessage as Message,
      );

      const result = await processor.handleSendWhatsAppMessage(
        jobWithoutParams as Job<WhatsAppSendJobData>,
      );

      expect(mockWhatsAppService.sendTemplateMessage).toHaveBeenCalledWith(
        'test-company',
        expect.objectContaining({
          to: '+50688776655',
          template_name: 'test_template',
          parameters: undefined,
        }),
      );

      expect(result).toEqual({
        success: true,
        messageId: 1,
        recipient: '+50688776655',
        templateName: 'test_template',
      });
    });

    it('should throw error when WhatsApp service fails', async () => {
      const error = new Error('WhatsApp API error');
      mockWhatsAppService.sendTemplateMessage.mockRejectedValue(error);

      await expect(
        processor.handleSendWhatsAppMessage(
          mockJob as Job<WhatsAppSendJobData>,
        ),
      ).rejects.toThrow('WhatsApp API error');

      expect(mockWhatsAppService.sendTemplateMessage).toHaveBeenCalledWith(
        'test-company',
        expect.objectContaining({
          to: '+50688776655',
          template_name: 'test_template',
        }),
      );
    });

    it('should handle empty parameters array', async () => {
      const jobDataWithEmptyParams = {
        ...jobData,
        parameters: [],
      };
      const jobWithEmptyParams = {
        ...mockJob,
        data: jobDataWithEmptyParams,
      };

      mockWhatsAppService.sendTemplateMessage.mockResolvedValue(
        mockMessage as Message,
      );

      const result = await processor.handleSendWhatsAppMessage(
        jobWithEmptyParams as Job<WhatsAppSendJobData>,
      );

      expect(mockWhatsAppService.sendTemplateMessage).toHaveBeenCalledWith(
        'test-company',
        expect.objectContaining({
          to: '+50688776655',
          template_name: 'test_template',
          parameters: [],
        }),
      );

      expect(result.success).toBe(true);
    });
  });
});
