import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { ConfigService } from '../config/config.service';
import { WebhookJobData } from '../queue/queue.service';

@Injectable()
export class WebhookQueueService {
  private readonly logger = new Logger(WebhookQueueService.name);

  constructor(
    @InjectQueue('webhook-process') private webhookQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async addWebhookJob(
    data: WebhookJobData,
    options?: Partial<JobOptions>,
  ): Promise<void> {
    const jobOptions: JobOptions = {
      attempts: this.configService.queueDefaultJobAttempts,
      delay: data.priority === 1 ? 0 : this.configService.queueDefaultJobDelay,
      backoff: {
        type: 'exponential',
        delay: this.configService.queueDefaultJobBackoffDelay,
      },
      priority: data.priority || 2,
      ...options,
    };

    try {
      const job = await this.webhookQueue.add(
        'process-webhook',
        data,
        jobOptions,
      );

      this.logger.log(
        `Webhook job added: ${job.id} (type: ${data.type})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add webhook job (${data.type}): ${error.message}`,
      );
      throw error;
    }
  }
} 