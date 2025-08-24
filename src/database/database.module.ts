import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '../config';
import { Company } from './models/company.model';
import { Message } from './models/message.model';
import { CompanyRepository } from './repositories/company.repository';
import { MessageRepository } from './repositories/message.repository';

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
        models: [Company, Message],
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
    SequelizeModule.forFeature([Company, Message]),
  ],
  providers: [CompanyRepository, MessageRepository],
  exports: [SequelizeModule, CompanyRepository, MessageRepository],
})
export class DatabaseModule {}
