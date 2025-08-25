import { Injectable, Logger } from '@nestjs/common';
import { ConversationRepository } from '../database/repositories/conversation.repository';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Conversation } from '../database/models/conversation.model';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly whatsappService: WhatsAppService,
  ) {}

  /**
   * Process incoming message and send appropriate response
   */
  async processIncomingMessage(
    phoneNumber: string,
    companyName: string,
    messageText: string,
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

    // Check if this is the first message (welcome step)
    if (conversation.current_step === 'welcome') {
      await this.handleFirstMessage(conversation, normalizedText);
    } else {
      // This is not the first message - send "not accepting" response
      await this.handleSubsequentMessage(conversation);
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
   * Handle subsequent messages - send "not accepting" response
   */
  private async handleSubsequentMessage(
    conversation: Conversation,
  ): Promise<void> {
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'Este número no está aceptando mensajes por el momento, excepto para aceptar o rechazar conversaciones.',
    );

    this.logger.log(
      `Sent "not accepting" response to ${conversation.phone_number}`,
    );
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
      'está bien',
      'claro',
      'perfecto',
      'entendido',
    ];
    return affirmativeWords.includes(text);
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

    // Update conversation step
    await this.conversationRepository.updateStep(conversation.id, 'accepted', {
      ...conversation.context,
      accepted: true,
      acceptedAt: new Date().toISOString(),
    });

    this.logger.log(`Conversation accepted for ${conversation.phone_number}`);
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
