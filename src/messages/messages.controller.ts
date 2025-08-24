import {
  Body,
  Controller,
  Post,
  Req,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SendMessageDto, SendMessageResponseDto } from '../dto';

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
    const companyId = (req as any).companyId;

    this.logger.log(
      `Sending message to ${sendMessageDto.recipients.length} recipients for company ${companyId}`,
    );

    return this.whatsappService.sendMessageToMultipleRecipients(
      companyId,
      sendMessageDto,
    );
  }
}
