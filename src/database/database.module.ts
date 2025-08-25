import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '../config';
import { Company } from './models/company.model';
import { Message } from './models/message.model';
import { Conversation } from './models/conversation.model';
import { List } from './models/list.model';
import { CompanyRepository } from './repositories/company.repository';
import { MessageRepository } from './repositories/message.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { ListRepository } from './repositories/list.repository';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.databaseHost || 'localhost',
        port: configService.databasePort || 3306,
        username: configService.databaseUsername || 'root',
        password: configService.databasePassword || '',
        database: configService.databaseName || 'waba_dispatcher',
        models: [Company, Message, Conversation, List],
        autoLoadModels: true,
        synchronize: false, // Never use in production - use migrations instead
        logging: configService.isDevelopment ? console.log : false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }),
      inject: [ConfigService],
    }),
    SequelizeModule.forFeature([Company, Message, Conversation, List]),
  ],
  providers: [CompanyRepository, MessageRepository, ConversationRepository, ListRepository],
  exports: [SequelizeModule, CompanyRepository, MessageRepository, ConversationRepository, ListRepository],
})
export class DatabaseModule {}
