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
});
