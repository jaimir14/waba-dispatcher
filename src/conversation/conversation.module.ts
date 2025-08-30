import { Module, forwardRef } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ConversationRepository } from '../database/repositories/conversation.repository';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ListsModule } from '../lists/lists.module';

@Module({
  imports: [forwardRef(() => WhatsAppModule), forwardRef(() => ListsModule)],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationRepository],
  exports: [ConversationService, ConversationRepository],
})
export class ConversationModule {}
