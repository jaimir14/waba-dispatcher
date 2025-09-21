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

  async findById(id: number, companyId?: string): Promise<Message | null> {
    const whereClause = companyId ? { id, company_id: companyId } : { id };
    return this.messageModel.findOne({
      where: whereClause,
      include: [Company],
    });
  }

  async findByWhatsAppId(
    whatsappMessageId: string,
    companyId?: string,
  ): Promise<Message | null> {
    const whereClause = companyId
      ? { whatsapp_message_id: whatsappMessageId, company_id: companyId }
      : { whatsapp_message_id: whatsappMessageId };
    return this.messageModel.findOne({
      where: whereClause,
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

  async findByPhoneNumber(
    phoneNumber: string,
    companyId?: string,
  ): Promise<Message[]> {
    const whereClause = companyId
      ? { to_phone_number: phoneNumber, company_id: companyId }
      : { to_phone_number: phoneNumber };
    return this.messageModel.findAll({
      where: whereClause,
      include: [Company],
      order: [['created_at', 'DESC']],
    });
  }

  async findByListId(listId: string, companyId?: string): Promise<Message[]> {
    const whereClause = companyId
      ? { list_id: listId, company_id: companyId }
      : { list_id: listId };
    return this.messageModel.findAll({
      where: whereClause,
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

  async updatePricing(id: number, pricing: any): Promise<[number, Message[]]> {
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
      const cost = Number(
        this.calculateMessageCost(message.pricing, message.status),
      );
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
    return Number(this.configService.whatsappCostPerMessage);
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

    console.log('localeStartDate', new Date(localeStartDate));
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
      attributes: [
        'status',
        'pricing',
        'created_at',
        'delivered_at',
        'read_at',
      ],
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
    let failedMessages = 0;
    let deliveredMessages = 0;
    let readMessages = 0;

    // Calculate response times for average
    const responseTimes: number[] = [];

    for (const message of messages) {
      // Count by status
      switch (message.status) {
        case MessageStatus.SENT:
          messageBreakdown.sent++;
          successfulMessages++;
          costBreakdown.sent += this.calculateMessageCost(
            message.pricing,
            message.status,
          );
          break;
        case MessageStatus.DELIVERED:
          messageBreakdown.delivered++;
          successfulMessages++;
          deliveredMessages++;
          costBreakdown.delivered += this.calculateMessageCost(
            message.pricing,
            message.status,
          );

          // Calculate response time if delivered
          if (message.delivered_at) {
            const responseTime =
              new Date(message.delivered_at).getTime() -
              new Date(message.created_at).getTime();
            responseTimes.push(responseTime);
          }
          break;
        case MessageStatus.READ:
          messageBreakdown.read++;
          successfulMessages++;
          deliveredMessages++;
          readMessages++;
          costBreakdown.read += this.calculateMessageCost(
            message.pricing,
            message.status,
          );

          // Calculate response time if read
          if (message.read_at) {
            const responseTime =
              new Date(message.read_at).getTime() -
              new Date(message.created_at).getTime();
            responseTimes.push(responseTime);
          }
          break;
        case MessageStatus.FAILED:
          messageBreakdown.failed++;
          failedMessages++;
          costBreakdown.failed += this.calculateMessageCost(
            message.pricing,
            message.status,
          );
          break;
      }
    }

    // Calculate average response time in minutes
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length /
          (1000 * 60) // Convert to minutes
        : null;

    // Get last message sent
    const lastMessage = messages.length > 0 ? messages[0] : null;

    return {
      totalMessages: messages.length,
      successfulMessages,
      failedMessages,
      deliveredMessages,
      readMessages,
      lastMessageSent: lastMessage
        ? lastMessage.created_at.toISOString()
        : null,
      averageResponseTime,
      messageBreakdown,
      costBreakdown,
    };
  }

  /**
   * Get all phone numbers with their stats for a company
   */
  async getAllPhoneNumberStats(
    companyId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalPhoneNumbers: number;
    phoneNumbers: Array<{
      phoneNumber: string;
      totalMessages: number;
      successfulMessages: number;
      failedMessages: number;
      deliveredMessages: number;
      readMessages: number;
      templateMessages: number;
      lastMessageSent: string | null;
      averageResponseTime: number | null;
      totalCost: number;
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
    }>;
    totalStats: {
      totalMessages: number;
      successfulMessages: number;
      failedMessages: number;
      deliveredMessages: number;
      readMessages: number;
      templateMessages: number;
      totalCost: number;
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
    };
  }> {
    // Create dates and add 6 hours using timestamp arithmetic
    const localeStartDate = startDate
      ? new Date(startDate + 'T00:00:00')
      : null;
    const localeEndDate = endDate ? new Date(endDate + 'T23:59:59') : null;

    if (localeStartDate) {
      localeStartDate.setTime(localeStartDate.getTime());
    }
    if (localeEndDate) {
      localeEndDate.setTime(localeEndDate.getTime());
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.created_at = {
        [Op.gte]: localeStartDate,
        [Op.lte]: localeEndDate,
      };
    } else if (startDate) {
      dateFilter.created_at = {
        [Op.gte]: localeStartDate,
      };
    } else if (endDate) {
      dateFilter.created_at = {
        [Op.lte]: localeEndDate,
      };
    }

    // Get all messages for the company grouped by phone number
    const messages = await this.messageModel.findAll({
      where: {
        company_id: companyId,
        ...dateFilter,
      },
      attributes: [
        'to_phone_number',
        'status',
        'pricing',
        'created_at',
        'delivered_at',
        'read_at',
        'template_name',
      ],
      order: [['created_at', 'DESC']],
    });

    // Group messages by phone number
    const phoneNumberGroups: { [phoneNumber: string]: any[] } = {};
    for (const message of messages) {
      if (!phoneNumberGroups[message.to_phone_number]) {
        phoneNumberGroups[message.to_phone_number] = [];
      }
      phoneNumberGroups[message.to_phone_number].push(message);
    }

    const phoneNumberStats = [];
    let totalStats = {
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      deliveredMessages: 0,
      readMessages: 0,
      templateMessages: 0,
      totalCost: 0,
      messageBreakdown: {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      },
      costBreakdown: {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      },
    };

    // Calculate stats for each phone number
    for (const [phoneNumber, phoneMessages] of Object.entries(
      phoneNumberGroups,
    )) {
      const messageBreakdown = {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        accepted: 0,
      };

      const costBreakdown = {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      };

      let successfulMessages = 0;
      let failedMessages = 0;
      let deliveredMessages = 0;
      let readMessages = 0;
      let templateMessages = 0;
      const responseTimes: number[] = [];

      for (const message of phoneMessages) {
        // Count template messages
        if (message.template_name && message.template_name.trim() !== '') {
          templateMessages++;
        }

        // Count by status
        switch (message.status) {
          case MessageStatus.SENT:
            messageBreakdown.sent++;
            successfulMessages++;
            costBreakdown.sent += this.calculateMessageCost(
              message.pricing,
              message.status,
            );
            break;
          case MessageStatus.DELIVERED:
            messageBreakdown.delivered++;
            successfulMessages++;
            deliveredMessages++;
            costBreakdown.delivered += this.calculateMessageCost(
              message.pricing,
              message.status,
            );

            if (message.delivered_at) {
              const responseTime =
                new Date(message.delivered_at).getTime() -
                new Date(message.created_at).getTime();
              responseTimes.push(responseTime);
            }
            break;
          case MessageStatus.READ:
            messageBreakdown.read++;
            successfulMessages++;
            deliveredMessages++;
            readMessages++;
            costBreakdown.read += this.calculateMessageCost(
              message.pricing,
              message.status,
            );

            if (message.read_at) {
              const responseTime =
                new Date(message.read_at).getTime() -
                new Date(message.created_at).getTime();
              responseTimes.push(responseTime);
            }
            break;
          case MessageStatus.ACCEPTED:
            messageBreakdown.accepted++;
            successfulMessages++;
            deliveredMessages++;
            readMessages++;
            costBreakdown.read += this.calculateMessageCost(
              message.pricing,
              message.status,
            );

            if (message.read_at) {
              const responseTime =
                new Date(message.read_at).getTime() -
                new Date(message.created_at).getTime();
              responseTimes.push(responseTime);
            }
            break;
          case MessageStatus.FAILED:
            messageBreakdown.failed++;
            failedMessages++;
            costBreakdown.failed += this.calculateMessageCost(
              message.pricing,
              message.status,
            );
            break;
        }
      }

      const totalCost =
        costBreakdown.sent +
        costBreakdown.delivered +
        costBreakdown.read +
        costBreakdown.failed;

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length /
            (1000 * 60) // Convert to minutes
          : null;

      const lastMessage = phoneMessages.length > 0 ? phoneMessages[0] : null;

      phoneNumberStats.push({
        phoneNumber,
        totalMessages: phoneMessages.length,
        successfulMessages,
        failedMessages,
        deliveredMessages,
        readMessages,
        templateMessages,
        lastMessageSent: lastMessage
          ? lastMessage.created_at.toISOString()
          : null,
        averageResponseTime,
        totalCost,
        messageBreakdown,
        costBreakdown,
      });

      // Add to total stats
      totalStats.totalMessages += phoneMessages.length;
      totalStats.successfulMessages += successfulMessages;
      totalStats.failedMessages += failedMessages;
      totalStats.deliveredMessages += deliveredMessages;
      totalStats.readMessages += readMessages;
      totalStats.templateMessages += templateMessages;
      totalStats.totalCost += totalCost;
      totalStats.messageBreakdown.sent += messageBreakdown.sent;
      totalStats.messageBreakdown.delivered += messageBreakdown.delivered;
      totalStats.messageBreakdown.read += messageBreakdown.read;
      totalStats.messageBreakdown.failed += messageBreakdown.failed;
      totalStats.costBreakdown.sent += costBreakdown.sent;
      totalStats.costBreakdown.delivered += costBreakdown.delivered;
      totalStats.costBreakdown.read += costBreakdown.read;
      totalStats.costBreakdown.failed += costBreakdown.failed;
    }

    // Sort phone numbers by total messages descending
    phoneNumberStats.sort((a, b) => b.totalMessages - a.totalMessages);

    return {
      totalPhoneNumbers: phoneNumberStats.length,
      phoneNumbers: phoneNumberStats,
      totalStats,
    };
  }
}
