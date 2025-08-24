import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { forwardRef, Inject } from '@nestjs/common';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { WhatsAppSendJobData } from '../queue.service';
import { CreateTemplateMessageDto, TextParameter } from '../../dto';

@Processor('whatsapp-send')
export class WhatsAppSendProcessor {
  private readonly logger = new Logger(WhatsAppSendProcessor.name);

  constructor(
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @Process('send-whatsapp-message')
  async handleSendWhatsAppMessage(job: Job<WhatsAppSendJobData>) {
    const { companyId, to, templateName, parameters } = job.data;

    this.logger.log(
      `Processing WhatsApp send job ${job.id}: ${templateName} to ${to} for company ${companyId}`,
    );

    try {
      // Create the message DTO
      const createMessageDto = new CreateTemplateMessageDto();
      createMessageDto.to = to;
      createMessageDto.template_name = templateName;
      createMessageDto.parameters = parameters?.map(
        (param) => new TextParameter({ text: param }),
      );

      // Send the message
      const message = await this.whatsAppService.sendTemplateMessage(
        companyId,
        createMessageDto,
      );

      this.logger.log(
        `WhatsApp message sent successfully: Job ${job.id}, Message ID ${message.id}`,
      );

      return {
        success: true,
        messageId: message.id,
        recipient: to,
        templateName,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process WhatsApp send job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Let BullMQ handle retries based on job configuration
      throw error;
    }
  }
}
