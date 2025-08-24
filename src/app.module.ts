import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { HttpClientModule } from './http';
import { DatabaseModule } from './database';
import { MessagesModule } from './messages';
import { WebhookModule } from './webhook';
import { ConversationModule } from './conversation';
import { ApiKeyMiddleware } from './middleware/api-key.middleware';

@Module({
  imports: [
    ConfigModule,
    HttpClientModule,
    DatabaseModule,
    MessagesModule,
    WebhookModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyMiddleware).forRoutes('*');
  }
}
