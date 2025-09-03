import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bull';
import { WhatsAppService } from './whatsapp.service';
import { Message } from '../database/models/message.model';
import { Company } from '../database/models/company.model';
import { Conversation } from '../database/models/conversation.model';
import { MessageRepository } from '../database/repositories/message.repository';
import { CompanyRepository } from '../database/repositories/company.repository';
import { ConfigModule, ConfigService } from '../config';
import { HttpClientModule } from '../http';
import { QueueService } from '../queue/queue.service';
import { WhatsAppSendProcessor } from '../queue/processors/whatsapp-send.processor';
import { ListMessageSendProcessor } from '../queue/processors/list-message-send.processor';
import { ListsModule } from '../lists/lists.module';

@Module({
  imports: [
    ConfigModule,
    HttpClientModule,
    ListsModule,
    SequelizeModule.forFeature([Message, Company, Conversation]),
    forwardRef(() => import('../conversation/conversation.module').then(m => m.ConversationModule)),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.redisHost,
          port: configService.redisPort,
          password: configService.redisPassword,
          db: configService.redisDb,
        },
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
    BullModule.registerQueueAsync({
      name: 'whatsapp-send',
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
    BullModule.registerQueueAsync({
      name: 'list-message-send',
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
  providers: [
    WhatsAppService,
    MessageRepository,
    CompanyRepository,
    QueueService,
    WhatsAppSendProcessor,
    ListMessageSendProcessor,
  ],
  exports: [WhatsAppService, QueueService],
})
export class WhatsAppModule {}
