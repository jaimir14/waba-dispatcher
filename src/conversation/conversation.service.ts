import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConversationRepository } from '../database/repositories/conversation.repository';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ListsService } from '../lists/lists.service';
import { Conversation } from '../database/models/conversation.model';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
    @Inject(forwardRef(() => ListsService))
    private readonly listsService: ListsService,
  ) {}

  /**
   * Process incoming message and send appropriate response
   */
  async processIncomingMessage(
    phoneNumber: string,
    companyName: string,
    messageText: string,
    isReaction: boolean = false,
  ): Promise<void> {
    this.logger.log(
      `Processing incoming message from ${phoneNumber} for company ${companyName}: "${messageText}"`,
    );

    // Find company by name first
    const company =
      await this.whatsappService['companyRepository'].findByName(companyName);
    if (!company) {
      throw new Error(`Company ${companyName} not found`);
    }

    // Find or create conversation
    const conversation = await this.conversationRepository.findOrCreate(
      phoneNumber,
      company.id,
    );

    // Update session expiration to 24 hours from now (any message extends the session)
    await this.conversationRepository.updateSessionExpiration(conversation.id);

    if(isReaction) {
      messageText = 'reaction';
    }
    // Process the message based on conversation status
    await this.handleMessage(conversation, messageText);
  }

  /**
   * Handle message based on conversation status
   */
  private async handleMessage(
    conversation: Conversation,
    messageText: string,
  ): Promise<void> {
    const normalizedText = messageText.toLowerCase().trim();

    this.logger.log(
      `Handling message in status "${conversation.current_step}": "${normalizedText}"`,
    );

    // Check for empty or missing message
    if (!normalizedText) {
      await this.handleInvalidMessage(conversation, 'empty_message');
      return;
    }

    // Handle different conversation states
    switch (conversation.current_step) {
      case 'welcome':
        await this.handleFirstMessage(conversation, normalizedText);
        break;
      case 'accepted':
        await this.handleAcceptedMessage(conversation, normalizedText);
        break;
      case 'waiting_response':
        await this.handleWaitingResponseMessage(conversation, normalizedText);
        break;
      case 'rejected':
        await this.handleRejectedMessage(conversation);
        break;
      default:
        await this.handleUnknownState(conversation);
    }
  }

  /**
   * Handle the first message - determine if conversation is accepted or rejected
   */
  private async handleFirstMessage(
    conversation: Conversation,
    messageText: string,
  ): Promise<void> {
    // Check for affirmative response
    if (this.isAffirmativeResponse(messageText)) {
      await this.handleAffirmativeResponse(conversation);
    } else {
      await this.handleRejectionResponse(conversation);
    }
  }

  /**
   * Handle messages when conversation is accepted
   */
  private async handleAcceptedMessage(
    conversation: Conversation,
    messageText: string,
  ): Promise<void> {
    // If user sends "Recibido", acknowledge it
    if (this.isReceivedResponse(messageText)) {
      await this.handleReceivedResponse(conversation);
    } else {
      // Any other message in accepted state - just log it
      this.logger.log(
        `Received message in accepted state from ${conversation.phone_number}: "${messageText}"`,
      );
    }
  }

  /**
   * Handle messages and reactions when waiting for response (after sending a list)
   */
  private async handleWaitingResponseMessage(
    conversation: Conversation,
    messageText: string,
  ): Promise<void> {
    // If user sends "Recibido", mark as accepted and extend session
    if (this.isReceivedResponse(messageText)) {
      await this.handleReceivedResponse(conversation);
      // Handle list response through ListsService
      await this.listsService.handleListResponse(
        conversation.id,
        conversation.current_step,
        messageText,
      );
    } else {
      // Any other message - keep waiting for "Recibido"
      this.logger.log(
        `Still waiting for "Recibido" from ${conversation.phone_number}, received: "${messageText}"`,
      );
    }
  }

  /**
   * Handle messages when conversation is rejected
   */
  private async handleRejectedMessage(
    conversation: Conversation,
  ): Promise<void> {
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'Si necesitas información adicional, puedes escribir a la persona encargada de la lista.',
    );
  }

  /**
   * Handle unknown conversation state
   */
  private async handleUnknownState(
    conversation: Conversation,
  ): Promise<void> {
    this.logger.warn(
      `Unknown conversation state "${conversation.current_step}" for ${conversation.phone_number}`,
    );
    // Reset to welcome state
    await this.conversationRepository.updateStep(conversation.id, 'welcome');
  }

  /**
   * Check if message is an affirmative response
   */
  private isAffirmativeResponse(text: string): boolean {
    const affirmativeWords = [
      'si',
      'sí',
      'yes',
      'ok',
      'okay',
      'vale',
      'de acuerdo',
      'esta bien',
      'está bien',
      'claro',
      'perfecto',
      'entendido',
      'reaction',
    ];
    return affirmativeWords.includes(text);
  }

  /**
   * Check if message is a "received" response
   */
  private isReceivedResponse(text: string): boolean {
    const receivedWords = [
      'recibido',
      'recibí',
      'recibida',
      'recibidas',
      'recibidos',
      'listo',
      'ok',
      'okay',
      'vale',
      'entendido',
      'perfecto',
      'de acuerdo',
      'claro',
      'reaction',
    ];

    // remove any special characters and keep spaces
    text = text.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    return receivedWords.includes(text);
  }

  /**
   * Handle affirmative response ("Si/sí")
   */
  private async handleAffirmativeResponse(
    conversation: Conversation,
  ): Promise<void> {
    this.logger.log(`User ${conversation.phone_number} confirmed with "Si/sí"`);

    // Send confirmation message
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'Entendido, las listas se enviarán a las horas configuradas',
    );

    // Start session and mark as accepted
    await this.conversationRepository.startSession(conversation.id);
    await this.conversationRepository.updateStep(conversation.id, 'accepted', {
      ...conversation.context,
      accepted: true,
      acceptedAt: new Date().toISOString(),
    });

    this.logger.log(`Conversation accepted for ${conversation.phone_number}`);
  }

  /**
   * Handle "Recibido" response
   */
  private async handleReceivedResponse(
    conversation: Conversation,
  ): Promise<void> {
    this.logger.log(`User ${conversation.phone_number} confirmed receipt with "Recibido"`);

    // Send acknowledgment
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'Perfecto, confirmado recibido.',
    );

    // Mark as accepted and extend session
    await this.conversationRepository.updateSessionExpiration(conversation.id);
    await this.conversationRepository.updateStep(conversation.id, 'accepted', {
      ...conversation.context,
      lastReceivedAt: new Date().toISOString(),
    });

    this.logger.log(`Receipt confirmed for ${conversation.phone_number}`);
  }

  /**
   * Handle rejection response (non-affirmative)
   */
  private async handleRejectionResponse(
    conversation: Conversation,
  ): Promise<void> {
    this.logger.log(
      `User ${conversation.phone_number} rejected with non-affirmative response`,
    );

    // Send rejection message
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'Entendido, no se enviarán listas a este número.',
    );

    // Update conversation step
    await this.conversationRepository.updateStep(conversation.id, 'rejected', {
      ...conversation.context,
      rejected: true,
      rejectedAt: new Date().toISOString(),
    });

    this.logger.log(`Conversation rejected for ${conversation.phone_number}`);
  }

  /**
   * Mark conversation as waiting for response (after sending a list)
   */
  async markAsWaitingResponse(
    phoneNumber: string,
    companyName: string,
  ): Promise<void> {
    const company =
      await this.whatsappService['companyRepository'].findByName(companyName);
    if (!company) {
      throw new Error(`Company ${companyName} not found`);
    }

    const conversation = await this.conversationRepository.findByPhoneAndCompany(
      phoneNumber,
      company.id,
    );

    if (conversation) {
      await this.conversationRepository.updateStep(conversation.id, 'waiting_response', {
        ...conversation.context,
        waitingForResponse: true,
        waitingStartedAt: new Date().toISOString(),
      });

      this.logger.log(`Marked conversation as waiting for response: ${phoneNumber}`);
    }
  }

  /**
   * Check if conversation session expires within the next X hours
   */
  async isSessionExpiringSoon(
    phoneNumber: string,
    companyName: string,
    hoursThreshold: number = 4,
  ): Promise<boolean> {
    const company =
      await this.whatsappService['companyRepository'].findByName(companyName);
    if (!company) {
      throw new Error(`Company ${companyName} not found`);
    }

    return this.conversationRepository.isSessionExpiringSoon(
      phoneNumber,
      company.id,
      hoursThreshold,
    );
  }

  /**
   * Send text message (non-template)
   */
  private async sendTextMessage(
    companyId: string,
    phoneNumber: string,
    text: string,
  ): Promise<void> {
    try {
      // For now, we'll use a simple text template
      // In a full implementation, you'd want to create a text message DTO
      const messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: text,
        },
      };

      // Use the HTTP service to send the message
      const company =
        await this.whatsappService['companyRepository'].findById(companyId);
      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }

      const phoneNumberId =
        company.settings?.metaPhoneNumberId ||
        this.whatsappService['configService'].metaPhoneNumberId;

      await this.whatsappService['httpService'].sendMessage(
        phoneNumberId,
        messageData,
      );

      this.logger.log(`Text message sent to ${phoneNumber}: "${text}"`);
    } catch (error) {
      this.logger.error(
        `Failed to send text message to ${phoneNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get conversation by phone number and company
   */
  async getConversation(
    phoneNumber: string,
    companyName: string,
  ): Promise<Conversation | null> {
    const company =
      await this.whatsappService['companyRepository'].findByName(companyName);
    if (!company) {
      throw new Error(`Company ${companyName} not found`);
    }
    return this.conversationRepository.findByPhoneAndCompany(
      phoneNumber,
      company.id,
    );
  }

  /**
   * Get all active conversations for a company
   */
  async getActiveConversations(companyName: string): Promise<Conversation[]> {
    const company =
      await this.whatsappService['companyRepository'].findByName(companyName);
    if (!company) {
      throw new Error(`Company ${companyName} not found`);
    }
    return this.conversationRepository.getActiveConversations(company.id);
  }

  /**
   * Handle invalid message
   */
  private async handleInvalidMessage(
    conversation: Conversation,
    reason: string,
  ): Promise<void> {
    // For invalid messages, treat as rejection
    await this.handleRejectionResponse(conversation);

    this.logger.log(
      `Conversation ${conversation.id} marked as rejected due to: ${reason}`,
    );
  }

  /**
   * Deactivate conversation
   */
  async deactivateConversation(conversationId: string): Promise<void> {
    await this.conversationRepository.deactivate(conversationId);
  }
}
