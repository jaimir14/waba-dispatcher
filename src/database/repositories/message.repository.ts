import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Message, MessageStatus } from '../models/message.model';
import { Company } from '../models/company.model';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectModel(Message)
    private readonly messageModel: typeof Message,
    private readonly configService: ConfigService,
  ) {}

  async create(data: Partial<Message>): Promise<Message> {
    // Set default pricing if not provided
    if (!data.pricing) {
      data.pricing = this.getDefaultPricing();
    }
    
    return this.messageModel.create(data);
  }

  /**
   * Get default pricing based on environment variables
   */
  private getDefaultPricing(): Record<string, any> {
    return {
      cost: this.configService.whatsappCostPerMessage,
      currency: this.configService.whatsappCurrency,
      created_at: new Date(),
      source: 'environment_default',
    };
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

  async findByListId(listId: string): Promise<Message[]> {
    return this.messageModel.findAll({
      where: { list_id: listId },
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

    console.log('updateData', JSON.stringify(updateData, null, 2));
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
      const cost = Number(this.calculateMessageCost(message.pricing, message.status));
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
    });

    return {
      totalMessages: messages.length,
      messageBreakdown,
      costBreakdown,
    };
  }

  private calculateMessageCost(pricing: any, status: MessageStatus): number {
    // Simple cost per message - no complex calculations
    if (status === MessageStatus.FAILED) {
      return 0;
    }

    // Use the cost from pricing if available, otherwise use default
    if (pricing && pricing.cost !== undefined) {
      console.log('pricing.cost', pricing.cost);
      return Number(pricing.cost);
    }

    // Default cost from environment
    return this.configService.whatsappCostPerMessage;
  }

  /**
   * Get phone number statistics
   */
  async getPhoneNumberStats(
    companyId: string,
    phoneNumber: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    deliveredMessages: number;
    readMessages: number;
    lastMessageSent: string | null;
    averageResponseTime: number | null;
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
    // Create dates and add 6 hours using timestamp arithmetic
    const localeStartDate = new Date(startDate + 'T00:00:00');
    const localeEndDate = new Date(endDate + 'T23:59:59');
    
    // Add 6 hours using timestamp arithmetic (this will properly handle day rollover)
    localeStartDate.setTime(localeStartDate.getTime());
    localeEndDate.setTime(localeEndDate.getTime());
    
    console.log('localeStartDate',  new Date(localeStartDate));
    console.log('localeEndDate', new Date(localeEndDate));
    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.created_at = {
        [Op.gte]: new Date(localeStartDate),
        [Op.lte]: new Date(localeEndDate),
      };
    } else if (startDate) {
      dateFilter.created_at = {
        [Op.gte]: new Date(localeStartDate),
      };
    } else if (endDate) {
      dateFilter.created_at = {
        [Op.lte]: new Date(localeEndDate),
      };
    }

    // Get all messages for the specific phone number
    const messages = await this.messageModel.findAll({
      where: {
        company_id: companyId,
        to_phone_number: phoneNumber,
        ...dateFilter,
      },
      attributes: ['status', 'pricing', 'created_at', 'delivered_at', 'read_at'],
      order: [['created_at', 'DESC']],
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

    let successfulMessages = 0;
    let lastMessageSent: string | null = null;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    messages.forEach(message => {
      // Count messages by status
      switch (message.status) {
        case MessageStatus.SENT:
          messageBreakdown.sent++;
          successfulMessages++;
          break;
        case MessageStatus.DELIVERED:
          messageBreakdown.delivered++;
          successfulMessages++;
          break;
        case MessageStatus.READ:
          messageBreakdown.read++;
          successfulMessages++;
          break;
        case MessageStatus.FAILED:
          messageBreakdown.failed++;
          break;
      }

      // Track last message sent
      if (message.status !== MessageStatus.FAILED && !lastMessageSent) {
        lastMessageSent = message.created_at.toISOString();
      }

      // Calculate response time (time between sent and delivered/read)
      if (message.delivered_at || message.read_at) {
        const responseTime = message.delivered_at || message.read_at;
        if (responseTime) {
          const sentTime = message.created_at;
          const responseTimeMs = responseTime.getTime() - sentTime.getTime();
          if (responseTimeMs > 0) {
            totalResponseTime += responseTimeMs;
            responseTimeCount++;
          }
        }
      }

      // Calculate costs based on pricing information
      const cost = Number(this.calculateMessageCost(message.pricing, message.status));
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
    });

    // Calculate average response time
    const averageResponseTime = responseTimeCount > 0 
      ? Math.round(totalResponseTime / responseTimeCount) 
      : null;



    return {
      totalMessages: messages.length,
      successfulMessages,
      failedMessages: messageBreakdown.failed,
      deliveredMessages: messageBreakdown.delivered,
      readMessages: messageBreakdown.read,
      lastMessageSent,
      averageResponseTime,
      messageBreakdown,
      costBreakdown,
    };
  }
}
