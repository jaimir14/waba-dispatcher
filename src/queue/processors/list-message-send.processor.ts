import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { forwardRef, Inject } from '@nestjs/common';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { ListMessageJobData } from '../queue.service';

@Processor('list-message-send')
export class ListMessageSendProcessor {
  private readonly logger = new Logger(ListMessageSendProcessor.name);

  constructor(
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @Process('send-list-message')
  async handleSendListMessage(job: Job<ListMessageJobData>) {
    const { companyName, sendListMessageDto, recipient } = job.data;

    this.logger.log(
      `Processing list message job ${job.id}: ${sendListMessageDto.listName} to ${recipient} for company ${companyName}`,
    );

    try {
      // Process individual recipient using the same logic from WhatsAppService
      const result = await this.whatsAppService.sendListMessageToRecipient(
        companyName,
        sendListMessageDto,
        recipient,
      );

      this.logger.log(
        `List message sent successfully: Job ${job.id}, Result: ${JSON.stringify(result)}`,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process list message job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Let BullMQ handle retries based on job configuration
      throw error;
    }
  }
} 