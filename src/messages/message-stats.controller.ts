import {
  Controller,
  Get,
  Query,
  Req,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { GetMessageStatsDto, MessageStatsResponseDto } from '../dto';

@Controller('message-stats')
export class MessageStatsController {
  private readonly logger = new Logger(MessageStatsController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('by-month')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMessageStatsByMonth(
    @Query() getMessageStatsDto: GetMessageStatsDto,
    @Req() req: Request,
  ): Promise<MessageStatsResponseDto> {
    const companyName = (req as any).companyId;

    this.logger.log(
      `Getting message stats for company ${companyName} for month ${getMessageStatsDto.month}`,
    );

    try {
      const stats = await this.whatsappService.getMessageStatsByMonth(
        companyName,
        getMessageStatsDto.month,
      );

      return {
        status: 'success',
        message: `Message statistics retrieved successfully for ${getMessageStatsDto.month}`,
        data: stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get message stats for company ${companyName}: ${error.message}`,
      );

      return {
        status: 'failed',
        message: `Failed to get message statistics: ${error.message}`,
      };
    }
  }
}
