import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { forwardRef, Inject } from '@nestjs/common';
import { WebhookService } from '../../webhook/webhook.service';
import { WebhookJobData } from '../queue.service';

@Processor('webhook-process')
export class WebhookProcessProcessor {
  private readonly logger = new Logger(WebhookProcessProcessor.name);

  constructor(
    @Inject(forwardRef(() => WebhookService))
    private readonly webhookService: WebhookService,
  ) {}

  @Process('process-webhook')
  async handleWebhookProcess(job: Job<WebhookJobData>) {
    const { type, data } = job.data;

    this.logger.log(
      `Processing webhook job ${job.id}: ${type}`,
    );

    try {
      // Delegate to webhook service based on type
      switch (type) {
        case 'incoming-message':
          await this.webhookService.processIncomingMessageJob(data);
          break;
        case 'status-update':
          await this.webhookService.processStatusUpdateJob(data);
          break;
        case 'message-accepted':
          await this.webhookService.processMessageAcceptedJob(data);
          break;
        default:
          throw new Error(`Unknown webhook job type: ${type}`);
      }

      this.logger.log(
        `Webhook job completed successfully: ${job.id}`,
      );

      return {
        success: true,
        type,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process webhook job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Let BullMQ handle retries based on job configuration
      throw error;
    }
  }
} 