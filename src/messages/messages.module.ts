import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessageStatsController } from './message-stats.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [MessagesController, MessageStatsController],
})
export class MessagesModule {}
