import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { HttpClientModule } from './http';
import { DatabaseModule } from './database';
import { MessagesModule } from './messages';
import { WebhookModule } from './webhook';
import { ConversationModule } from './conversation';
import { ListsModule } from './lists';
import { CompanyModule } from './company';
import { ApiKeyMiddleware } from './middleware/api-key.middleware';
import { AdminAuthMiddleware } from './middleware/admin-auth.middleware';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    HttpClientModule,
    DatabaseModule,
    MessagesModule,
    WebhookModule,
    ConversationModule,
    ListsModule,
    CompanyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply admin authentication to company management endpoints
    consumer
      .apply(AdminAuthMiddleware)
      .forRoutes('companies');

    // Apply regular API key middleware to other endpoints
    consumer
      .apply(ApiKeyMiddleware)
      .exclude(
        { path: 'webhook', method: RequestMethod.GET },
        { path: 'webhook', method: RequestMethod.POST },
        { path: 'webhook/health', method: RequestMethod.GET },
        { path: 'companies', method: RequestMethod.ALL },
        { path: 'companies/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
