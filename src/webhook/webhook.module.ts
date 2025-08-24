import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { HttpClientModule } from '../http';
import { DatabaseModule } from '../database';
import { ConfigModule } from '../config';
import { ConversationModule } from '../conversation';

@Module({
  imports: [HttpClientModule, DatabaseModule, ConfigModule, ConversationModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
