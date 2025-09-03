import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { ListMessageSendProcessor } from './list-message-send.processor';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { ListMessageJobData } from '../queue.service';

describe('ListMessageSendProcessor', () => {
  let processor: ListMessageSendProcessor;
  let mockWhatsAppService: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    mockWhatsAppService = {
      sendListMessageToRecipient: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListMessageSendProcessor,
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
      ],
    }).compile();

    processor = module.get<ListMessageSendProcessor>(ListMessageSendProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleSendListMessage', () => {
    const mockJobData: ListMessageJobData = {
      companyName: 'test-company',
      recipient: '+1234567890',
      sendListMessageDto: {
        listId: 'test-list-001',
        listName: 'Test List',
        reporter: 'Test Reporter',
        recipients: ['+1234567890'],
        numbers: [
          { number: '01', amount: 100 },
          { number: '02', amount: 200 },
        ],
      },
      priority: 1,
    };

    const mockJob = {
      id: 'test-job-123',
      data: mockJobData,
    } as Job<ListMessageJobData>;

    it('should successfully process list message job', async () => {
      const expectedResult = {
        recipient: '+1234567890',
        status: 'sent' as 'sent' | 'failed',
        messageId: 'msg-123',
      };

      mockWhatsAppService.sendListMessageToRecipient.mockResolvedValue(expectedResult);

      const result = await processor.handleSendListMessage(mockJob);

      expect(result).toEqual({
        success: true,
        ...expectedResult,
      });

      expect(mockWhatsAppService.sendListMessageToRecipient).toHaveBeenCalledWith(
        'test-company',
        mockJobData.sendListMessageDto,
        '+1234567890',
      );
    });

    it('should handle errors and rethrow for retry mechanism', async () => {
      const error = new Error('Failed to send message');
      mockWhatsAppService.sendListMessageToRecipient.mockRejectedValue(error);

      await expect(processor.handleSendListMessage(mockJob)).rejects.toThrow(error);

      expect(mockWhatsAppService.sendListMessageToRecipient).toHaveBeenCalledWith(
        'test-company',
        mockJobData.sendListMessageDto,
        '+1234567890',
      );
    });
  });
}); 