import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SendMessageDto, SendMessageResponseDto } from '../dto';

describe('MessagesController', () => {
  let controller: MessagesController;
  let mockWhatsAppService: jest.Mocked<WhatsAppService>;

  const mockSendMessageDto: SendMessageDto = {
    templateName: 'inicio_conversacion',
    language: 'es',
    parameters: ['Alfredo Alvarado'],
    recipients: ['+50683186803'],
  };

  const mockResponse: SendMessageResponseDto = {
    status: 'success',
    message: 'Sent to 1/1 recipients',
    results: [
      {
        recipient: '+50683186803',
        status: 'sent',
        messageId: '123',
      },
    ],
  };

  beforeEach(async () => {
    mockWhatsAppService = {
      sendMessageToMultipleRecipients: jest.fn(),
      sendListMessage: jest.fn(),
      getMessagesByDay: jest.fn(),
      getPhoneNumberStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should send message to multiple recipients successfully', async () => {
      mockWhatsAppService.sendMessageToMultipleRecipients.mockResolvedValue(
        mockResponse,
      );

      const req = { companyId: 'test_company' } as any;
      const result = await controller.sendMessage(mockSendMessageDto, req);

      expect(
        mockWhatsAppService.sendMessageToMultipleRecipients,
      ).toHaveBeenCalledWith('test_company', mockSendMessageDto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle multiple recipients', async () => {
      const multipleRecipientsDto: SendMessageDto = {
        ...mockSendMessageDto,
        recipients: ['+50683186803', '+50688888888', '+50699999999'],
      };

      const multipleResponse: SendMessageResponseDto = {
        status: 'success',
        message: 'Sent to 3/3 recipients',
        results: [
          { recipient: '+50683186803', status: 'sent', messageId: '123' },
          { recipient: '+50688888888', status: 'sent', messageId: '124' },
          { recipient: '+50699999999', status: 'sent', messageId: '125' },
        ],
      };

      mockWhatsAppService.sendMessageToMultipleRecipients.mockResolvedValue(
        multipleResponse,
      );

      const req = { companyId: 'test_company' } as any;
      const result = await controller.sendMessage(multipleRecipientsDto, req);

      expect(
        mockWhatsAppService.sendMessageToMultipleRecipients,
      ).toHaveBeenCalledWith('test_company', multipleRecipientsDto);
      expect(result).toEqual(multipleResponse);
    });

    it('should handle partial failures', async () => {
      const partialFailureResponse: SendMessageResponseDto = {
        status: 'partial',
        message: 'Sent to 2/3 recipients',
        results: [
          { recipient: '+50683186803', status: 'sent', messageId: '123' },
          { recipient: '+50688888888', status: 'sent', messageId: '124' },
          {
            recipient: '+50699999999',
            status: 'failed',
            error: 'Invalid number',
          },
        ],
      };

      mockWhatsAppService.sendMessageToMultipleRecipients.mockResolvedValue(
        partialFailureResponse,
      );

      const multipleRecipientsDto: SendMessageDto = {
        ...mockSendMessageDto,
        recipients: ['+50683186803', '+50688888888', '+50699999999'],
      };

      const req = { companyId: 'test_company' } as any;
      const result = await controller.sendMessage(multipleRecipientsDto, req);

      expect(result).toEqual(partialFailureResponse);
      expect(result.status).toBe('partial');
    });

    it('should pass correct company ID from request', async () => {
      mockWhatsAppService.sendMessageToMultipleRecipients.mockResolvedValue(
        mockResponse,
      );

      const req = { companyId: 'different_company' } as any;
      await controller.sendMessage(mockSendMessageDto, req);

      expect(
        mockWhatsAppService.sendMessageToMultipleRecipients,
      ).toHaveBeenCalledWith('different_company', mockSendMessageDto);
    });
  });

  describe('getPhoneNumberStats', () => {
    it('should get phone number stats successfully', async () => {
      const mockStatsResponse = {
        phoneNumber: '+50683186803',
        totalMessages: 10,
        successfulMessages: 8,
        failedMessages: 2,
        deliveredMessages: 6,
        readMessages: 2,
        lastMessageSent: '2024-01-15T10:30:00.000Z',
        averageResponseTime: 5000,
        totalCost: 1.28, // 16 successful messages × 0.08
        currency: 'USD',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        messageBreakdown: {
          sent: 8,
          delivered: 6,
          read: 2,
          failed: 2
        },
        costBreakdown: {
          sent: 0.64, // 8 messages × 0.08
          delivered: 0.48, // 6 messages × 0.08
          read: 0.16, // 2 messages × 0.08
          failed: 0.000
        }
      };

      mockWhatsAppService.getPhoneNumberStats.mockResolvedValue(mockStatsResponse);

      const req = { companyId: 'test_company' } as any;
      const result = await controller.getPhoneNumberStats('+50683186803', req, '2024-01-01', '2024-01-31');

      expect(mockWhatsAppService.getPhoneNumberStats).toHaveBeenCalledWith(
        'test_company',
        '+50683186803',
        '2024-01-01',
        '2024-01-31'
      );
      expect(result).toEqual({
        status: 'success',
        message: 'Stats retrieved successfully for phone number +50683186803',
        data: mockStatsResponse
      });
    });

    it('should get phone number stats without date filters', async () => {
      const mockStatsResponse = {
        phoneNumber: '+50683186803',
        totalMessages: 25,
        successfulMessages: 23,
        failedMessages: 2,
        deliveredMessages: 18,
        readMessages: 5,
        lastMessageSent: '2024-01-20T15:45:00.000Z',
        averageResponseTime: 3000,
        totalCost: 1.84, // 23 successful messages × 0.08
        currency: 'USD',
        period: {
          startDate: 'all',
          endDate: 'all'
        },
        messageBreakdown: {
          sent: 23,
          delivered: 18,
          read: 5,
          failed: 2
        },
        costBreakdown: {
          sent: 1.84, // 23 messages × 0.08
          delivered: 1.44, // 18 messages × 0.08
          read: 0.40, // 5 messages × 0.08
          failed: 0.000
        }
      };

      mockWhatsAppService.getPhoneNumberStats.mockResolvedValue(mockStatsResponse);

      const req = { companyId: 'test_company' } as any;
      const result = await controller.getPhoneNumberStats('+50683186803', req);

      expect(mockWhatsAppService.getPhoneNumberStats).toHaveBeenCalledWith(
        'test_company',
        '+50683186803',
        undefined,
        undefined
      );
      expect(result).toEqual({
        status: 'success',
        message: 'Stats retrieved successfully for phone number +50683186803',
        data: mockStatsResponse
      });
    });

    it('should handle service errors gracefully', async () => {
      const errorMessage = 'Failed to retrieve stats';
      mockWhatsAppService.getPhoneNumberStats.mockRejectedValue(new Error(errorMessage));

      const req = { companyId: 'companyId' } as any;
      const result = await controller.getPhoneNumberStats('+50683186803', req);

      expect(result).toEqual({
        status: 'failed',
        message: `Failed to get phone number stats: ${errorMessage}`
      });
    });
  });
});
