import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Param,
  Req,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { 
  SendMessageDto, 
  SendMessageResponseDto,
  SendListMessageDto,
  SendListMessageResponseDto,
  GetMessagesByDayDto,
  GetMessagesByDayResponseDto,
  GetPhoneNumberStatsDto,
  PhoneNumberStatsResponseDto,
  SendInformationalMessageDto,
  SendInformationalMessageResponseDto,
} from '../dto';

@Controller('messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto | SendInformationalMessageDto,
    @Req() req: Request,
  ): Promise<SendMessageResponseDto | SendInformationalMessageResponseDto> {
    const companyName = (req as any).companyId;

    // Check if this is an informational message (has 'message' property)
    if ('message' in sendMessageDto && 'type' in sendMessageDto) {
      const informationalDto = sendMessageDto as SendInformationalMessageDto;
      
      this.logger.log(
        `Sending informational message to ${informationalDto.recipients.length} recipients for company ${companyName}`,
      );

      return this.whatsappService.sendInformationalMessage(
        companyName,
        informationalDto,
      );
    } else {
      // Handle as template message
      const templateDto = sendMessageDto as SendMessageDto;
      
      this.logger.log(
        `Sending template message to ${templateDto.recipients.length} recipients for company ${companyName}`,
      );

      return this.whatsappService.sendMessageToMultipleRecipients(
        companyName,
        templateDto,
      );
    }
  }

  @Post('send-list')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendListMessage(
    @Body() sendListMessageDto: SendListMessageDto,
    @Req() req: Request,
  ): Promise<SendListMessageResponseDto> {
    const companyName = (req as any).companyId;

    this.logger.log(
      `Sending list message "${sendListMessageDto.listName}" to ${sendListMessageDto.recipients.length} recipients for company ${companyName}`,
    );

    return this.whatsappService.sendListMessage(
      companyName,
      sendListMessageDto,
    );
  }

  @Get('by-day')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMessagesByDay(
    @Query() getMessagesByDayDto: GetMessagesByDayDto,
    @Req() req: Request,
  ): Promise<GetMessagesByDayResponseDto> {
    const companyName = (req as any).companyId;

    this.logger.log(
      `Getting messages for company ${companyName} for date ${getMessagesByDayDto.date}`,
    );

    try {
      const data = await this.whatsappService.getMessagesByDay(
        companyName,
        getMessagesByDayDto.date,
        getMessagesByDayDto.status,
      );

      return {
        status: 'success',
        message: `Messages retrieved successfully for ${getMessagesByDayDto.date}`,
        data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get messages for company ${companyName}: ${error.message}`,
      );

      return {
        status: 'failed',
        message: `Failed to get messages: ${error.message}`,
      };
    }
  }

  @Get('stats/:phoneNumber')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPhoneNumberStats(
    @Param('phoneNumber') phoneNumber: string,
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PhoneNumberStatsResponseDto> {
    const companyName = (req as any).companyId;

    this.logger.log(
      `Getting stats for phone number ${phoneNumber} for company ${companyName}`,
    );

    try {
      const data = await this.whatsappService.getPhoneNumberStats(
        companyName,
        phoneNumber,
        startDate,
        endDate,
      );

      return {
        status: 'success',
        message: `Stats retrieved successfully for phone number ${phoneNumber}`,
        data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stats for phone number ${phoneNumber} in company ${companyName}: ${error.message}`,
      );

      return {
        status: 'failed',
        message: `Failed to get phone number stats: ${error.message}`,
      };
    }
  }
}
