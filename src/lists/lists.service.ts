import { Injectable, Logger } from '@nestjs/common';
import { ListRepository } from '../database/repositories/list.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { ListStatus } from '../database/models/list.model';
import { CreateListDto, ListResponseDto, ListQueryDto } from '../dto/list.dto';

@Injectable()
export class ListsService {
  private readonly logger = new Logger(ListsService.name);

  constructor(
    private readonly listRepository: ListRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  /**
   * Create a new list entry when a list message is sent successfully
   */
  async createList(createListDto: CreateListDto): Promise<ListResponseDto> {
    this.logger.debug(`Creating list with ID: ${createListDto.list_id} for conversation: ${createListDto.conversation_id}`);

    const list = await this.listRepository.create(
      createListDto.conversation_id,
      createListDto.list_id,
      createListDto.metadata,
    );

    return this.mapToListResponseDto(list);
  }

  /**
   * Create or update a list entry (upsert functionality)
   */
  async createOrUpdateList(createListDto: CreateListDto): Promise<ListResponseDto> {
    this.logger.debug(`Creating or updating list with ID: ${createListDto.list_id} for conversation: ${createListDto.conversation_id}`);

    const list = await this.listRepository.createOrUpdate(
      createListDto.conversation_id,
      createListDto.list_id,
      createListDto.metadata,
    );

    return this.mapToListResponseDto(list);
  }

  /**
   * Handle webhook response for list interactions
   * If status is 'waiting_response' and we receive an answer, mark all pending lists as accepted
   */
  async handleListResponse(
    conversationId: string,
    status: string,
    messageText?: string,
  ): Promise<void> {
    this.logger.debug(`Handling list response for conversation: ${conversationId}, status: ${status}`);

    if (status === 'waiting_response' && messageText) {
      // Mark all pending lists for today as accepted
      const today = new Date();
      const affectedRows = await this.listRepository.markAllPendingAsAccepted(
        conversationId,
        today,
      );

      this.logger.log(`Marked ${affectedRows} pending lists as accepted for conversation: ${conversationId}`);
    }
  }

  /**
   * Get lists by query parameters
   */
  async getLists(query: ListQueryDto): Promise<ListResponseDto[]> {
    this.logger.debug(`Getting lists with query: ${JSON.stringify(query)}`);

    let lists;
    if (query.conversation_id && query.status) {
      lists = await this.listRepository.getByStatusAndConversation(
        query.status,
        query.conversation_id,
      );
    } else if (query.conversation_id) {
      lists = await this.listRepository.getByConversationId(query.conversation_id);
    } else if (query.status) {
      lists = await this.listRepository.getByStatus(query.status);
    } else if (query.list_id) {
      const list = await this.listRepository.findByListId(
        query.list_id,
      );
      lists = list ? [list] : [];
    } else {
      lists = [];
    }

    // For each list, get the related messages
    const listsWithMessages = await Promise.all(
      lists.map(async (list) => {
        const messages = await this.messageRepository.findByListId(list.list_id);
        return {
          ...this.mapToListResponseDto(list),
          messages: messages.map(msg => ({
            id: msg.id,
            conversation_id: msg.to_phone_number, // Use phone number as conversation_id
            list_id: msg.list_id,
            status: this.mapMessageStatusToListStatus(msg.status),
            accepted_at: msg.delivered_at, // Map delivered to accepted
            rejected_at: null, // Messages don't track rejection
            expired_at: null, // Messages don't track expiration
            metadata: {
              whatsapp_message_id: msg.whatsapp_message_id,
              error_code: msg.error_code,
              error_message: msg.error_message,
              pricing: msg.pricing,
            },
            created_at: msg.created_at,
            updated_at: msg.updated_at,
          })),
        };
      })
    );

    return listsWithMessages;
  }

  /**
   * Get list by ID
   */
  async getListById(listId: string): Promise<ListResponseDto | null> {
    this.logger.debug(`Getting list by ID: ${listId}`);

    const list = await this.listRepository.findById(listId);
    return list ? this.mapToListResponseDto(list) : null;
  }

  /**
   * Update list status
   */
  async updateListStatus(listId: string, status: ListStatus): Promise<void> {
    this.logger.debug(`Updating list ${listId} status to: ${status}`);

    switch (status) {
      case ListStatus.SENT:
        await this.listRepository.markAsSent(listId);
        break;
      case ListStatus.DELIVERED:
        await this.listRepository.markAsDelivered(listId);
        break;
      case ListStatus.READ:
        await this.listRepository.markAsRead(listId);
        break;
      case ListStatus.ACCEPTED:
        await this.listRepository.markAsAccepted(listId);
        break;
      case ListStatus.FAILED:
        await this.listRepository.markAsFailed(listId);
        break;
      case ListStatus.REJECTED:
        await this.listRepository.markAsRejected(listId);
        break;
      case ListStatus.EXPIRED:
        await this.listRepository.markAsExpired(listId);
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }
  }

  /**
   * Get pending lists for a conversation on a specific date
   */
  async getPendingListsByDate(
    conversationId: string,
    date: Date,
  ): Promise<ListResponseDto[]> {
    this.logger.debug(`Getting pending lists for conversation: ${conversationId} on date: ${date.toISOString()}`);

    const lists = await this.listRepository.getPendingListsByConversationAndDate(
      conversationId,
      date,
    );

    return lists.map(list => this.mapToListResponseDto(list));
  }

  /**
   * Mark all pending lists for a conversation on a specific date as accepted
   */
  async markAllPendingAsAccepted(
    conversationId: string,
    date: Date,
  ): Promise<number> {
    this.logger.debug(`Marking all pending lists as accepted for conversation: ${conversationId} on date: ${date.toISOString()}`);

    return await this.listRepository.markAllPendingAsAccepted(conversationId, date);
  }

  /**
   * Map List model to ListResponseDto
   */
  private mapToListResponseDto(list: any): ListResponseDto {
    return {
      id: list.id,
      conversation_id: list.conversation_id,
      list_id: list.list_id,
      status: list.status,
      accepted_at: list.accepted_at,
      rejected_at: list.rejected_at,
      expired_at: list.expired_at,
      metadata: list.metadata,
      created_at: list.created_at,
      updated_at: list.updated_at,
    };
  }

  /**
   * Map MessageStatus to ListStatus
   */
  private mapMessageStatusToListStatus(messageStatus: string): ListStatus {
    switch (messageStatus) {
      case 'pending':
        return ListStatus.PENDING;
      case 'sent':
        return ListStatus.SENT;
      case 'delivered':
        return ListStatus.DELIVERED;
      case 'read':
        return ListStatus.READ;
      case 'accepted':
        return ListStatus.ACCEPTED;
      case 'failed':
        return ListStatus.FAILED;
      default:
        return ListStatus.PENDING;
    }
  }
} 