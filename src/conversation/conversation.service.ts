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
    companyId: string,
    messageText: string,
  ): Promise<void> {
    this.logger.log(
      `Processing incoming message from ${phoneNumber} for company ${companyId}: "${messageText}"`,
    );

    // Find or create conversation
    const conversation = await this.conversationRepository.findOrCreate(
      phoneNumber,
      companyId,
    );

    // Process the message based on current step
    await this.handleMessage(conversation, messageText);
  }

  /**
   * Handle message based on conversation step and content
   */
  private async handleMessage(
    conversation: Conversation,
    messageText: string,
  ): Promise<void> {
    const normalizedText = messageText.toLowerCase().trim();

    this.logger.log(
      `Handling message in step "${conversation.current_step}": "${normalizedText}"`,
    );

    // Check for empty or missing message
    if (!normalizedText) {
      await this.handleInvalidMessage(conversation, 'empty_message');
      return;
    }

    // Check for "Si/sí" response (case insensitive)
    if (this.isAffirmativeResponse(normalizedText)) {
      await this.handleAffirmativeResponse(conversation);
      return;
    }

    // Handle other responses based on current step
    switch (conversation.current_step) {
      case 'welcome':
        await this.handleWelcomeStep(conversation);
        break;
      case 'waiting_confirmation':
        await this.handleConfirmationStep(conversation);
        break;
      default:
        await this.handleDefaultResponse(conversation);
        break;
    }
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
    await this.conversationRepository.updateStep(conversation.id, 'confirmed', {
      ...conversation.context,
      confirmed: true,
      confirmedAt: new Date().toISOString(),
    });

    this.logger.log(`Confirmation sent to ${conversation.phone_number}`);
  }

  /**
   * Handle welcome step
   */
  private async handleWelcomeStep(conversation: Conversation): Promise<void> {
    // For now, just acknowledge the message
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'Gracias por tu mensaje. ¿Necesitas ayuda con algo específico?',
    );

    await this.conversationRepository.updateStep(
      conversation.id,
      'waiting_confirmation',
    );
  }

  /**
   * Handle confirmation step
   */
  private async handleConfirmationStep(
    conversation: Conversation,
  ): Promise<void> {
    // If they send another message, mark as invalid
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'No se recibió una confirmación válida. La conversación ha sido marcada como inválida.',
    );

    // Mark conversation as invalid
    await this.conversationRepository.updateStep(conversation.id, 'invalid', {
      ...conversation.context,
      invalid: true,
      invalidAt: new Date().toISOString(),
      reason: 'non_affirmative_response',
    });

    this.logger.log(`Conversation ${conversation.id} marked as invalid`);
  }

  /**
   * Handle default response
   */
  private async handleDefaultResponse(
    conversation: Conversation,
  ): Promise<void> {
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'No se recibió una confirmación válida. La conversación ha sido marcada como inválida.',
    );

    // Mark conversation as invalid
    await this.conversationRepository.updateStep(conversation.id, 'invalid', {
      ...conversation.context,
      invalid: true,
      invalidAt: new Date().toISOString(),
      reason: 'invalid_response',
    });

    this.logger.log(`Conversation ${conversation.id} marked as invalid`);
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
    companyId: string,
  ): Promise<Conversation | null> {
    return this.conversationRepository.findByPhoneAndCompany(
      phoneNumber,
      companyId,
    );
  }

  /**
   * Get all active conversations for a company
   */
  async getActiveConversations(companyId: string): Promise<Conversation[]> {
    return this.conversationRepository.getActiveConversations(companyId);
  }

  /**
   * Handle invalid message
   */
  private async handleInvalidMessage(
    conversation: Conversation,
    reason: string,
  ): Promise<void> {
    await this.sendTextMessage(
      conversation.company_id,
      conversation.phone_number,
      'No se recibió una confirmación válida. La conversación ha sido marcada como inválida.',
    );

    // Mark conversation as invalid
    await this.conversationRepository.updateStep(conversation.id, 'invalid', {
      ...conversation.context,
      invalid: true,
      invalidAt: new Date().toISOString(),
      reason,
    });

    this.logger.log(
      `Conversation ${conversation.id} marked as invalid: ${reason}`,
    );
  }

  /**
   * Deactivate conversation
   */
  async deactivateConversation(conversationId: string): Promise<void> {
    await this.conversationRepository.deactivate(conversationId);
  }
}
