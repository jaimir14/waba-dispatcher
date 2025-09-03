import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { ConfigService } from '../config/config.service';
import { SendListMessageDto } from '../dto/list-message.dto';

export interface WhatsAppSendJobData {
  companyId: string;
  to: string;
  templateName: string;
  parameters?: any[];
  priority?: number;
}
export interface ListMessageJobData {
  companyName: string;
  sendListMessageDto: SendListMessageDto;
  recipient: string;
  priority?: number;
}

export interface WebhookJobData {
  type: 'incoming-message' | 'status-update' | 'message-accepted';
  data: any;
  priority?: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('whatsapp-send') private whatsappSendQueue: Queue,
    @InjectQueue('list-message-send') private listMessageQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async addWhatsAppSendJob(
    data: WhatsAppSendJobData,
    options?: Partial<JobOptions>,
  ): Promise<void> {
    const jobOptions: JobOptions = {
      attempts: this.configService.queueDefaultJobAttempts,
      delay: data.priority === 1 ? 0 : this.configService.queueDefaultJobDelay,
      backoff: {
        type: 'exponential',
        delay: this.configService.queueDefaultJobBackoffDelay,
      },
      priority: data.priority || 0,
      ...options,
    };

    try {
      const job = await this.whatsappSendQueue.add(
        'send-whatsapp-message',
        data,
        jobOptions,
      );

      this.logger.log(
        `WhatsApp send job added: ${job.id} for ${data.to} (template: ${data.templateName})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add WhatsApp send job for ${data.to}: ${error.message}`,
      );
      throw error;
    }
  }

  async addBulkWhatsAppSendJobs(
    jobs: Array<{ data: WhatsAppSendJobData; options?: Partial<JobOptions> }>,
  ): Promise<void> {
    try {
      const bulkJobs = jobs.map((job, index) => ({
        name: 'send-whatsapp-message',
        data: job.data,
        opts: {
          attempts: this.configService.queueDefaultJobAttempts,
          delay:
            job.data.priority === 1
              ? index * 100
              : this.configService.queueDefaultJobDelay + index * 1000,
          backoff: {
            type: 'exponential',
            delay: this.configService.queueDefaultJobBackoffDelay,
          },
          priority: job.data.priority || 0,
          ...job.options,
        },
      }));

      const addedJobs = await this.whatsappSendQueue.addBulk(bulkJobs);

      this.logger.log(`Added ${addedJobs.length} WhatsApp send jobs to queue`);
    } catch (error) {
      this.logger.error(
        `Failed to add bulk WhatsApp send jobs: ${error.message}`,
      );
      throw error;
    }
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.whatsappSendQueue.getWaiting(),
      this.whatsappSendQueue.getActive(),
      this.whatsappSendQueue.getCompleted(),
      this.whatsappSendQueue.getFailed(),
      this.whatsappSendQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async pauseQueue(): Promise<void> {
    await this.whatsappSendQueue.pause();
    this.logger.log('WhatsApp send queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.whatsappSendQueue.resume();
    this.logger.log('WhatsApp send queue resumed');
  }

  async clearQueue(): Promise<void> {
    await this.whatsappSendQueue.empty();
    this.logger.log('WhatsApp send queue cleared');
  }

  async addListMessageJob(
    data: ListMessageJobData,
    options?: Partial<JobOptions>,
  ): Promise<void> {
    const jobOptions: JobOptions = {
      attempts: this.configService.queueDefaultJobAttempts,
      delay: data.priority === 1 ? 0 : this.configService.queueDefaultJobDelay,
      backoff: {
        type: 'exponential',
        delay: this.configService.queueDefaultJobBackoffDelay,
      },
      priority: data.priority || 0,
      ...options,
    };

    try {
      const job = await this.listMessageQueue.add(
        'send-list-message',
        data,
        jobOptions,
      );

      this.logger.log(
        `List message job added: ${job.id} for ${data.recipient} (list: ${data.sendListMessageDto.listId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add list message job for ${data.recipient}: ${error.message}`,
      );
      throw error;
    }
  }

  async addBulkListMessageJobs(
    jobs: Array<{ data: ListMessageJobData; options?: Partial<JobOptions> }>,
  ): Promise<void> {
    const formattedJobs = jobs.map(({ data, options }) => ({
      name: 'send-list-message',
      data,
      opts: {
        attempts: this.configService.queueDefaultJobAttempts,
        delay: data.priority === 1 ? 0 : this.configService.queueDefaultJobDelay,
        backoff: {
          type: 'exponential',
          delay: this.configService.queueDefaultJobBackoffDelay,
        },
        priority: data.priority || 0,
        ...options,
      },
    }));

    try {
      await this.listMessageQueue.addBulk(formattedJobs);
      this.logger.log(`Added ${jobs.length} list message jobs to queue`);
    } catch (error) {
      this.logger.error(
        `Failed to add bulk list message jobs: ${error.message}`,
      );
      throw error;
    }
  }

  async getListMessageQueueStats() {
    return await this.listMessageQueue.getJobCounts();
  }

  async pauseListMessageQueue(): Promise<void> {
    await this.listMessageQueue.pause();
    this.logger.log('List message queue paused');
  }

  async resumeListMessageQueue(): Promise<void> {
    await this.listMessageQueue.resume();
    this.logger.log('List message queue resumed');
  }

  async clearListMessageQueue(): Promise<void> {
    await this.listMessageQueue.empty();
    this.logger.log('List message queue cleared');
  }


}
