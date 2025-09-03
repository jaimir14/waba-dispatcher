import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookQueueService } from './webhook-queue.service';
import { HttpClientModule } from '../http';
import { DatabaseModule } from '../database';
import { ConfigModule, ConfigService } from '../config';
import { ConversationModule } from '../conversation';
import { ListsModule } from '../lists/lists.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WebhookProcessProcessor } from '../queue/processors/webhook-process.processor';

@Module({
  imports: [
    HttpClientModule, 
    DatabaseModule, 
    ConfigModule, 
    ConversationModule, 
    ListsModule, 
    WhatsAppModule,
    BullModule.registerQueueAsync({
      name: 'webhook-process',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        defaultJobOptions: {
          attempts: configService.queueDefaultJobAttempts,
          delay: configService.queueDefaultJobDelay,
          backoff: {
            type: 'exponential',
            delay: configService.queueDefaultJobBackoffDelay,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookQueueService, WebhookProcessProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}
