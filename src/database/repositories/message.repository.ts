import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Message, MessageStatus } from '../models/message.model';
import { Company } from '../models/company.model';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectModel(Message)
    private readonly messageModel: typeof Message,
  ) {}

  async create(data: Partial<Message>): Promise<Message> {
    return this.messageModel.create(data);
  }

  async findById(id: number): Promise<Message | null> {
    return this.messageModel.findByPk(id, {
      include: [Company],
    });
  }

  async findByWhatsAppId(whatsappMessageId: string): Promise<Message | null> {
    return this.messageModel.findOne({
      where: { whatsapp_message_id: whatsappMessageId },
      include: [Company],
    });
  }

  async findByCompanyId(companyId: string): Promise<Message[]> {
    return this.messageModel.findAll({
      where: { company_id: companyId },
      include: [Company],
      order: [['created_at', 'DESC']],
    });
  }

  async findByStatus(status: MessageStatus): Promise<Message[]> {
    return this.messageModel.findAll({
      where: { status },
      include: [Company],
      order: [['created_at', 'DESC']],
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Message[]> {
    return this.messageModel.findAll({
      where: { to_phone_number: phoneNumber },
      include: [Company],
      order: [['created_at', 'DESC']],
    });
  }

  async updateStatus(
    id: number,
    status: MessageStatus,
    additionalData?: Partial<Message>,
  ): Promise<[number, Message[]]> {
    const updateData: Partial<Message> = { status, ...additionalData };

    // Set timestamp based on status
    switch (status) {
      case MessageStatus.SENT:
        updateData.sent_at = new Date();
        break;
      case MessageStatus.DELIVERED:
        updateData.delivered_at = new Date();
        break;
      case MessageStatus.READ:
        updateData.read_at = new Date();
        break;
    }

    return this.messageModel.update(updateData, {
      where: { id },
      returning: true,
    });
  }

  async updateWhatsAppId(
    id: number,
    whatsappMessageId: string,
  ): Promise<[number, Message[]]> {
    return this.messageModel.update(
      { whatsapp_message_id: whatsappMessageId },
      {
        where: { id },
        returning: true,
      },
    );
  }

  async updatePricing(
    id: number,
    pricing: any,
  ): Promise<[number, Message[]]> {
    return this.messageModel.update(
      { pricing },
      {
        where: { id },
        returning: true,
      },
    );
  }

  async markAsFailed(
    id: number,
    errorCode: string,
    errorMessage: string,
  ): Promise<[number, Message[]]> {
    return this.messageModel.update(
      {
        status: MessageStatus.FAILED,
        error_code: errorCode,
        error_message: errorMessage,
      },
      {
        where: { id },
        returning: true,
      },
    );
  }

  async getPendingMessages(): Promise<Message[]> {
    return this.messageModel.findAll({
      where: { status: MessageStatus.PENDING },
      include: [Company],
      order: [['created_at', 'ASC']],
    });
  }

  async getFailedMessages(): Promise<Message[]> {
    return this.messageModel.findAll({
      where: { status: MessageStatus.FAILED },
      include: [Company],
      order: [['created_at', 'DESC']],
    });
  }

  async delete(id: number): Promise<number> {
    return this.messageModel.destroy({
      where: { id },
    });
  }

  async countByCompanyAndStatus(
    companyId: string,
    status: MessageStatus,
    hours?: number,
  ): Promise<number> {
    const where: any = {
      company_id: companyId,
      status,
    };

    if (hours) {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);
      where.created_at = {
        [Op.gte]: cutoffDate,
      };
    }

    return this.messageModel.count({ where });
  }

  async getMessagesByDay(
    companyId: string,
    date: string, // Format: "YYYY-MM-DD"
    status?: string,
  ): Promise<Message[]> {
    // Parse date to get start and end of day
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0); // Start of day
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999); // End of day

    const where: any = {
      company_id: companyId,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      },
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    return this.messageModel.findAll({
      where,
      include: [Company],
      order: [['created_at', 'DESC']],
    });
  }

  async getMessageStatsByMonth(
    companyId: string,
    month: string, // Format: "YYYY-MM"
  ): Promise<{
    totalMessages: number;
    messageBreakdown: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
    costBreakdown: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
  }> {
    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1); // First day of month
    const endDate = new Date(year, monthNum, 0); // Last day of month

    // Get all messages for the company in the specified month
    const messages = await this.messageModel.findAll({
      where: {
        company_id: companyId,
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      attributes: ['status', 'pricing'],
    });

    // Calculate breakdowns
    const messageBreakdown = {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    const costBreakdown = {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    messages.forEach(message => {
      // Count messages by status
      switch (message.status) {
        case MessageStatus.SENT:
          messageBreakdown.sent++;
          break;
        case MessageStatus.DELIVERED:
          messageBreakdown.delivered++;
          break;
        case MessageStatus.READ:
          messageBreakdown.read++;
          break;
        case MessageStatus.FAILED:
          messageBreakdown.failed++;
          break;
      }

      // Calculate costs based on pricing information
      if (message.pricing) {
        const cost = this.calculateMessageCost(message.pricing, message.status);
        switch (message.status) {
          case MessageStatus.SENT:
            costBreakdown.sent += cost;
            break;
          case MessageStatus.DELIVERED:
            costBreakdown.delivered += cost;
            break;
          case MessageStatus.READ:
            costBreakdown.read += cost;
            break;
          case MessageStatus.FAILED:
            costBreakdown.failed += cost;
            break;
        }
      }
    });

    return {
      totalMessages: messages.length,
      messageBreakdown,
      costBreakdown,
    };
  }

  private calculateMessageCost(pricing: any, status: MessageStatus): number {
    // WhatsApp pricing structure (as of 2024):
    // - Session messages: $0.0399 per message
    // - Business-initiated messages: $0.0585 per message
    // - Failed messages: $0.00 (no charge)

    if (status === MessageStatus.FAILED) {
      return 0;
    }

    // Default pricing if no specific pricing is available
    const defaultCost = 0.0399; // Session message cost

    if (pricing && pricing.billable) {
      return pricing.billable * 0.001; // Convert from micro-units to dollars
    }

    return defaultCost;
  }
}
