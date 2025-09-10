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
import { ApiKeyMiddleware } from './middleware/api-key.middleware';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiKeyMiddleware)
      .exclude(
        { path: 'webhook', method: RequestMethod.GET },
        { path: 'webhook', method: RequestMethod.POST },
        { path: 'webhook/health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
