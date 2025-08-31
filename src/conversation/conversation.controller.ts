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
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationService } from './conversation.service';
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

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly conversationService: ConversationService,
  ) {}

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

  @Get(':phoneNumber')
  async getConversationByPhoneNumber(
    @Param('phoneNumber') phoneNumber: string,
    @Req() req: Request,
  ): Promise<any> {
    const companyId = (req as any).companyId;

    this.logger.log(
      `Getting conversation for ${phoneNumber} in company ${companyId}`,
    );

    try {
      const conversation = await this.conversationService.getConversation(
        phoneNumber,
        'testcompany', // Default company for now
      );

      return {
        success: true,
        conversation: conversation,
      };
    } catch (error) {
      this.logger.error(`Error getting conversation for ${phoneNumber}:`, error);
      return {
        success: false,
        conversation: null,
        error: error.message,
      };
    }
  }

  @Get(':phoneNumber/expiring-soon')
  async isSessionExpiringSoon(
    @Param('phoneNumber') phoneNumber: string,
    @Req() req: Request,
  ): Promise<any> {
    const companyId = (req as any).companyId;

    this.logger.log(
      `Checking if session is expiring soon for ${phoneNumber} in company ${companyId}`,
    );

    try {
      const isExpiringSoon = await this.conversationService.isSessionExpiringSoon(
        phoneNumber,
        'testcompany', // Default company for now
        4, // 4 hours threshold
      );

      return {
        success: true,
        isExpiringSoon: isExpiringSoon,
      };
    } catch (error) {
      this.logger.error(`Error checking session expiration for ${phoneNumber}:`, error);
      return {
        success: true,
        isExpiringSoon: false, // Default to not expiring if error
      };
    }
  }
}
