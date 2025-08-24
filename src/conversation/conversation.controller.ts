import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  Logger,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  StartConversationDto,
  StartConversationResponseDto,
  SendTextMessageDto,
  SendTextMessageResponseDto,
  GetConversationDto,
  GetConversationResponseDto,
} from '../dto';

@Controller('conversations')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('start')
  @UsePipes(new ValidationPipe({ transform: true }))
  async startConversation(
    @Body() startConversationDto: StartConversationDto,
    @Req() req: Request,
  ): Promise<StartConversationResponseDto> {
    const companyId = (req as any).companyId;

    this.logger.log(
      `Starting conversation with ${startConversationDto.to} for company ${companyId}`,
    );

    return this.whatsappService.startConversation(
      companyId,
      startConversationDto,
    );
  }

  @Post('send-text')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendTextMessage(
    @Body() sendTextMessageDto: SendTextMessageDto,
    @Req() req: Request,
  ): Promise<SendTextMessageResponseDto> {
    const companyId = (req as any).companyId;

    this.logger.log(
      `Sending text message to ${sendTextMessageDto.to} for company ${companyId}`,
    );

    return this.whatsappService.sendTextMessage(companyId, sendTextMessageDto);
  }

  @Get('get')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getConversation(
    @Query() getConversationDto: GetConversationDto,
    @Req() req: Request,
  ): Promise<GetConversationResponseDto> {
    const companyId = (req as any).companyId;

    this.logger.log(
      `Getting conversation for ${getConversationDto.phoneNumber} in company ${companyId}`,
    );

    return this.whatsappService.getConversation(companyId, getConversationDto);
  }
}
