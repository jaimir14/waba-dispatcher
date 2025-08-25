import {
  Body,
  Controller,
  Post,
  Get,
  Query,
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
} from '../dto';

@Controller('messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: Request,
  ): Promise<SendMessageResponseDto> {
    const companyName = (req as any).companyId;

    this.logger.log(
      `Sending message to ${sendMessageDto.recipients.length} recipients for company ${companyName}`,
    );

    return this.whatsappService.sendMessageToMultipleRecipients(
      companyName,
      sendMessageDto,
    );
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
}
