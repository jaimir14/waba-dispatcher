import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { HttpClientModule } from '../http';
import { DatabaseModule } from '../database';
import { ConfigModule } from '../config';
import { ConversationModule } from '../conversation';
import { ListsModule } from '../lists/lists.module';

@Module({
  imports: [HttpClientModule, DatabaseModule, ConfigModule, ConversationModule, ListsModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
