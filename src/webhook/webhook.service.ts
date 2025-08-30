import { Injectable, Logger } from '@nestjs/common';
import {
  WebhookPayload,
  WebhookEntryChangeValueStatus,
} from '../dto/webhook.dto';
import { MessageRepository } from '../database/repositories/message.repository';
import { MessageStatus } from '../database/models/message.model';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationRepository } from '../database/repositories/conversation.repository';
import { ListsService } from '../lists/lists.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationService: ConversationService,
    private readonly conversationRepository: ConversationRepository,
    private readonly listsService: ListsService,
  ) {}

  /**
   * Process incoming webhook payload from WhatsApp
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    this.logger.log('Processing webhook payload', {
      object: payload.object,
      entryCount: payload.entry.length,
    });

    for (const entry of payload.entry) {
      await this.processEntry(entry);
    }
  }

  /**
   * Process individual webhook entry
   */
  private async processEntry(entry: any): Promise<void> {
    this.logger.log(`Processing entry ${entry.id}`, {
      time: entry.time,
      changesCount: entry.changes.length,
    });

    console.log('entry changes', entry.changes);

    for (const change of entry.changes) {
      await this.processChange(change);
    }
  }

  /**
   * Process individual change in webhook entry
   */
  private async processChange(change: any): Promise<void> {
    this.logger.log(`Processing change for field: ${change.field}`);

    if (change.field === 'messages') {
      await this.processMessages(change.value);
    } else if (change.field === 'message_deliveries') {
      await this.processMessageDeliveries(change.value);
    } else if (change.field === 'message_reads') {
      await this.processMessageReads(change.value);
    } else {
      this.logger.log(`Unhandled change field: ${change.field}`);
    }
  }

  /**
   * Process incoming messages
   */
  private async processMessages(value: any): Promise<void> {
    if (!value.messages || value.messages.length === 0) {
      return;
    }

    this.logger.log(`Processing ${value.messages.length} incoming messages`);

    for (const message of value.messages) {
      this.logger.log(`Incoming message: ${message.id}`, {
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
      });

      // Process incoming message for conversation flow
      if (message.type === 'text' && message.text?.body || message.type === 'reaction') {
        try {
          // Find existing conversation to get company ID
          const conversation =
            await this.conversationRepository.findByPhoneNumber(message.from);

          let companyName: string;
          if (conversation) {
            // Use existing conversation's company
            const company = await this.conversationService['whatsappService'][
              'companyRepository'
            ].findById(conversation.company_id);
            companyName = company?.name || 'testcompany';
            this.logger.log(
              `Found existing conversation for ${message.from} with company ${companyName}`,
            );
          } else {
            // New conversation - use default company
            companyName = 'testcompany';
            this.logger.log(
              `New conversation for ${message.from}, using default company ${companyName}`,
            );
          }

          // Process the incoming message for conversation flow
          await this.conversationService.processIncomingMessage(
            message.from,
            companyName,
            message.text?.body || message.reaction?.emoji,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process incoming message from ${message.from}: ${error.message}`,
          );
        }
      } else {
        // Handle missing or invalid message content
        try {
          // Find existing conversation to get company ID
          const conversation =
            await this.conversationRepository.findByPhoneNumber(message.from);

          let companyName: string;
          if (conversation) {
            const company = await this.conversationService['whatsappService'][
              'companyRepository'
            ].findById(conversation.company_id);
            companyName = company?.name || 'testcompany';
          } else {
            companyName = 'testcompany';
          }

          await this.conversationService.processIncomingMessage(
            message.from,
            companyName,
            '', // Empty message to mark as invalid
          );
        } catch (error) {
          this.logger.error(
            `Failed to process invalid message from ${message.from}: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Process message delivery status updates
   */
  private async processMessageDeliveries(value: any): Promise<void> {
    if (!value.statuses || value.statuses.length === 0) {
      return;
    }

    this.logger.log(
      `Processing ${value.statuses.length} delivery status updates`,
    );

    for (const status of value.statuses) {
      await this.updateMessageStatus(status);
    }
  }

  /**
   * Process message read status updates
   */
  private async processMessageReads(value: any): Promise<void> {
    if (!value.statuses || value.statuses.length === 0) {
      return;
    }

    this.logger.log(`Processing ${value.statuses.length} read status updates`);

    for (const status of value.statuses) {
      await this.updateMessageStatus(status);
    }
  }

  /**
   * Update message status based on webhook data
   */
  private async updateMessageStatus(
    status: WebhookEntryChangeValueStatus,
  ): Promise<void> {
    try {
      const message = await this.messageRepository.findByWhatsAppId(status.id);

      if (!message) {
        this.logger.warn(
          `Message with WhatsApp ID ${status.id} not found in database`,
        );
        return;
      }

      let newStatus: MessageStatus;
      let additionalData: Partial<any> = {};

      switch (status.status) {
        case 'sent':
          newStatus = MessageStatus.SENT;
          // Capture pricing information from WhatsApp
          if (status.pricing) {
            additionalData.pricing = {
              billable: status.pricing.billable,
              pricing_model: status.pricing.pricing_model,
              category: status.pricing.category,
            };
          }
          break;
        case 'delivered':
          newStatus = MessageStatus.DELIVERED;
          // Update pricing if not already captured
          if (status.pricing && !message.pricing) {
            additionalData.pricing = {
              billable: status.pricing.billable,
              pricing_model: status.pricing.pricing_model,
              category: status.pricing.category,
            };
          }
          break;
        case 'read':
          newStatus = MessageStatus.READ;
          // Update pricing if not already captured
          if (status.pricing && !message.pricing) {
            additionalData.pricing = {
              billable: status.pricing.billable,
              pricing_model: status.pricing.pricing_model,
              category: status.pricing.category,
            };
          }
          break;
        case 'failed':
          newStatus = MessageStatus.FAILED;
          if (status.error) {
            additionalData = {
              error_code: status.error.code,
              error_message: status.error.message,
              error_data: status.error.error_data,
            };
          }
          // Failed messages have 0 cost
          additionalData.pricing = {
            billable: 0,
            pricing_model: 'failed',
            category: 'failed',
          };
          break;
        default:
          this.logger.warn(
            `Unknown status: ${status.status} for message ${status.id}`,
          );
          return;
      }

      await this.messageRepository.updateStatus(
        message.id,
        newStatus,
        additionalData,
      );

      this.logger.log(`Message ${message.id} status updated to ${newStatus}`, {
        whatsappId: status.id,
        newStatus,
        timestamp: status.timestamp,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update message status for ${status.id}:`,
        error,
      );
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(
    body: string,
    signature: string,
    webhookSecret: string,
  ): boolean {
    try {
      // WhatsApp sends signature in format: sha256=hash
      const signatureParts = signature.split('=');
      if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
        this.logger.warn('Invalid signature format');
        return false;
      }

      const receivedHash = signatureParts[1];

      // Calculate expected signature
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(body);
      const calculatedHash = hmac.digest('hex');

      const isValid = receivedHash === calculatedHash;

      if (!isValid) {
        this.logger.warn('Signature verification failed', {
          receivedHash: receivedHash.substring(0, 8) + '...',
          calculatedHash: calculatedHash.substring(0, 8) + '...',
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}
