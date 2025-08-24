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
}
