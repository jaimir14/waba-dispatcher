import { Injectable } from '@nestjs/common';
import { Conversation } from '../models/conversation.model';
import { Op } from 'sequelize';

@Injectable()
export class ConversationRepository {
  /**
   * Find conversation by phone number and company
   */
  async findByPhoneAndCompany(
    phoneNumber: string,
    companyId: string,
  ): Promise<Conversation | null> {
    return Conversation.findOne({
      where: {
        phone_number: phoneNumber,
        company_id: companyId,
        is_active: true,
      },
    });
  }

  /**
   * Find conversation by phone number (any company)
   */
  async findByPhoneNumber(phoneNumber: string): Promise<Conversation | null> {
    return Conversation.findOne({
      where: {
        phone_number: phoneNumber,
        is_active: true,
      },
      order: [['last_message_at', 'DESC']], // Get most recent
    });
  }

  /**
   * Find or create conversation
   */
  async findOrCreate(
    phoneNumber: string,
    companyId: string,
  ): Promise<Conversation> {
    const [conversation] = await Conversation.findOrCreate({
      where: {
        phone_number: phoneNumber,
        company_id: companyId,
        is_active: true,
      },
      defaults: {
        phone_number: phoneNumber,
        company_id: companyId,
        current_step: 'welcome',
        context: {},
        last_message_at: new Date(),
        is_active: true,
      },
    });

    return conversation;
  }

  /**
   * Update conversation step and context
   */
  async updateStep(
    conversationId: string,
    step: string,
    context?: Record<string, any>,
  ): Promise<void> {
    const updateData: any = {
      current_step: step,
      last_message_at: new Date(),
    };

    if (context) {
      updateData.context = context;
    }

    await Conversation.update(updateData, {
      where: { id: conversationId },
    });
  }

  /**
   * Update conversation context
   */
  async updateContext(
    conversationId: string,
    context: Record<string, any>,
  ): Promise<void> {
    await Conversation.update(
      {
        context,
        last_message_at: new Date(),
      },
      {
        where: { id: conversationId },
      },
    );
  }

  /**
   * Mark conversation as inactive
   */
  async deactivate(conversationId: string): Promise<void> {
    await Conversation.update(
      {
        is_active: false,
        last_message_at: new Date(),
      },
      {
        where: { id: conversationId },
      },
    );
  }

  /**
   * Get active conversations for a company
   */
  async getActiveConversations(companyId: string): Promise<Conversation[]> {
    return Conversation.findAll({
      where: {
        company_id: companyId,
        is_active: true,
      },
      order: [['last_message_at', 'DESC']],
    });
  }

  /**
   * Get conversation by ID
   */
  async findById(conversationId: string): Promise<Conversation | null> {
    return Conversation.findByPk(conversationId);
  }

  /**
   * Delete old inactive conversations (cleanup)
   */
  async deleteOldInactiveConversations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Conversation.destroy({
      where: {
        is_active: false,
        last_message_at: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    return result;
  }

  /**
   * Update session expiration to 24 hours from now
   */
  async updateSessionExpiration(phoneNumber: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24 + 6); // 6 hours more than 24 hours because of the timezone difference

    await Conversation.update(
      {
        session_expires_at: expiresAt,
        last_message_at: new Date(),
      },
      {
        where: { phone_number: phoneNumber },
      },
    );
  }

  /**
   * Start session (set session_started_at and session_expires_at)
   */
  async startSession(conversationId: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await Conversation.update(
      {
        session_started_at: now,
        session_expires_at: expiresAt,
        last_message_at: now,
      },
      {
        where: { id: conversationId },
      },
    );
  }

  /**
   * Check if conversation session expires within the next X hours, return true if the conversation does not e
   */
  async isSessionExpiringSoon(
    phoneNumber: string,
    companyId: string,
    hoursThreshold: number = 4,
  ): Promise<boolean> {
    const thresholdTime = new Date();
    thresholdTime.setHours(thresholdTime.getHours() + hoursThreshold);

    const conversation = await Conversation.findOne({
      where: {
        phone_number: phoneNumber,
        company_id: companyId,
        is_active: true,
      },
    });

    // If conversation doesn't exist, treat as already expired
    if (!conversation) {
      return true;
    }

    // If conversation exists, check if it expires soon
    return conversation.session_expires_at < thresholdTime;
  }

  /**
   * Get conversation with session info
   */
  async findByPhoneAndCompanyWithSession(
    phoneNumber: string,
    companyId: string,
  ): Promise<Conversation | null> {
    return Conversation.findOne({
      where: {
        phone_number: phoneNumber,
        company_id: companyId,
        is_active: true,
      },
    });
  }
}
