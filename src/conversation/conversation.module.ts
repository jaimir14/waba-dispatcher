import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ConversationRepository } from '../database/repositories/conversation.repository';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ListsModule } from '../lists/lists.module';
import { ConversationExpiryService } from './conversation-expiry.service';
import { Conversation } from '../database/models/conversation.model';
import { Company } from '../database/models/company.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Conversation, Company]),
    forwardRef(() => WhatsAppModule), 
    forwardRef(() => ListsModule)
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    ConversationRepository,
    ConversationExpiryService,
  ],
  exports: [ConversationService, ConversationRepository, ConversationExpiryService],
})
export class ConversationModule {}
