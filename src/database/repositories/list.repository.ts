import { Injectable } from '@nestjs/common';
import { List, ListStatus } from '../models/list.model';
import { Op } from 'sequelize';

@Injectable()
export class ListRepository {
  /**
   * Create a new list entry
   */
  async create(
    conversationId: string,
    listId: string,
    metadata?: Record<string, any>,
  ): Promise<List> {
    return List.create({
      conversation_id: conversationId,
      list_id: listId,
      status: ListStatus.PENDING,
      metadata,
    });
  }

  /**
   * Find list by ID
   */
  async findById(listId: string): Promise<List | null> {
    return List.findByPk(listId);
  }

  /**
   * Find list by external list_id and conversation
   */
  async findByListIdAndConversation(
    listId: string,
    conversationId: string,
  ): Promise<List | null> {
    return List.findOne({
      where: {
        list_id: listId,
        conversation_id: conversationId,
      },
    });
  }

  /**
   * Find list by external list_id
   */
  async findByListId(
    listId: string,
  ): Promise<List | null> {
    return List.findOne({
      where: {
        list_id: listId,
      },
    });
  }
  /**
   * Get all pending lists for a conversation on a specific date
   */
  async getPendingListsByConversationAndDate(
    conversationId: string,
    date: Date,
  ): Promise<List[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return List.findAll({
      where: {
        conversation_id: conversationId,
        status: ListStatus.PENDING,
        created_at: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      order: [['created_at', 'ASC']],
    });
  }

  /**
   * Update list status to sent
   */
  async markAsSent(listId: string): Promise<void> {
    await List.update(
      {
        status: ListStatus.SENT,
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Update list status to delivered
   */
  async markAsDelivered(listId: string): Promise<void> {
    await List.update(
      {
        status: ListStatus.DELIVERED,
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Update list status to read
   */
  async markAsRead(listId: string): Promise<void> {
    await List.update(
      {
        status: ListStatus.READ,
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Update list status to accepted
   */
  async markAsAccepted(listId: string): Promise<void> {
    await List.update(
      {
        status: ListStatus.ACCEPTED,
        accepted_at: new Date(),
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Update list status to failed
   */
  async markAsFailed(listId: string): Promise<void> {
    await List.update(
      {
        status: ListStatus.FAILED,
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Update list status to rejected
   */
  async markAsRejected(listId: string): Promise<void> {
    await List.update(
      {
        status: ListStatus.REJECTED,
        rejected_at: new Date(),
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Update list status to expired
   */
  async markAsExpired(listId: string): Promise<void> {
    await List.update(
      {
        status: ListStatus.EXPIRED,
        expired_at: new Date(),
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Update list metadata
   */
  async updateMetadata(listId: string, metadata: Record<string, any>): Promise<void> {
    await List.update(
      {
        metadata,
      },
      {
        where: { id: listId },
      },
    );
  }

  /**
   * Create or update list (upsert functionality)
   */
  async createOrUpdate(
    conversationId: string,
    listId: string,
    metadata?: Record<string, any>,
  ): Promise<List> {
    // Try to find existing list
    const existingList = await this.findByListIdAndConversation(listId, conversationId);
    
    if (existingList) {
      // Update existing list metadata and reset status to pending
      await List.update(
        {
          status: ListStatus.PENDING,
          metadata,
          accepted_at: null,
          rejected_at: null,
          expired_at: null,
        },
        {
          where: { id: existingList.id },
        },
      );
      
      // Return updated list
      return List.findByPk(existingList.id);
    } else {
      // Create new list
      return this.create(conversationId, listId, metadata);
    }
  }

  /**
   * Mark all pending lists for a conversation on a specific date as accepted
   */
  async markAllPendingAsAccepted(
    conversationId: string,
    date: Date,
  ): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await List.update(
      {
        status: ListStatus.ACCEPTED,
        accepted_at: new Date(),
      },
      {
        where: {
          conversation_id: conversationId,
          status: ListStatus.PENDING,
          created_at: {
            [Op.between]: [startOfDay, endOfDay],
          },
        },
      },
    );

    return result[0]; // Number of affected rows
  }

  /**
   * Get lists by conversation ID
   */
  async getByConversationId(conversationId: string): Promise<List[]> {
    return List.findAll({
      where: {
        conversation_id: conversationId,
      },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get lists by status
   */
  async getByStatus(status: ListStatus): Promise<List[]> {
    return List.findAll({
      where: {
        status,
      },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get lists by status and conversation
   */
  async getByStatusAndConversation(
    status: ListStatus,
    conversationId: string,
  ): Promise<List[]> {
    return List.findAll({
      where: {
        status,
        conversation_id: conversationId,
      },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Delete old lists (cleanup)
   */
  async deleteOldLists(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await List.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    return result;
  }

  /**
   * Get list with conversation details
   */
  async findByIdWithConversation(listId: string): Promise<List | null> {
    return List.findByPk(listId, {
      include: ['conversation'],
    });
  }

  /**
   * Get lists by multiple list IDs
   */
  async getByListIds(listIds: string[]): Promise<List[]> {
    if (listIds.length === 0) {
      return [];
    }

    return List.findAll({
      where: {
        list_id: {
          [Op.in]: listIds,
        },
      },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get lists by date range
   */
  async getByDateRange(
    startDate: Date,
    endDate: Date,
    conversationId?: string,
  ): Promise<List[]> {
    const whereClause: any = {
      created_at: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (conversationId) {
      whereClause.conversation_id = conversationId;
    }

    return List.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });
  }
} 