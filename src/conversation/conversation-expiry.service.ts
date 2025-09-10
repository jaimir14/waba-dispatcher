import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Conversation } from '../database/models/conversation.model';
import { Company } from '../database/models/company.model';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class ConversationExpiryService {
  private readonly logger = new Logger(ConversationExpiryService.name);

  constructor(
    @InjectModel(Conversation)
    private readonly conversationModel: typeof Conversation,
    private readonly whatsappService: WhatsAppService,
  ) {}

  /**
   * Cron job that runs every day at 8:00 AM
   * Checks for conversations that expire today or expired yesterday
   * and sends inicio_conversacion template if conversation window is inactive
   */
  @Cron('0 8 * * *', {
    name: 'conversation-expiry-check',
    timeZone: 'America/Mexico_City', // Adjust timezone as needed
  })
  async handleConversationExpiry(): Promise<void> {
    this.logger.log('Starting conversation expiry check...');

    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(23, 59, 59, 999); // End of today

      const yesterdayEnd = new Date(now);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999); // End of yesterday

      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(23, 59, 59, 999);

      // Find conversations that:
      // 1. Expire today (session_expires_at between start of today and end of today)
      // 2. Expired yesterday (session_expires_at between start of yesterday and end of yesterday)
      // 3. Are still active
      // 4. Did not expire more than 2 days ago (user rejection threshold)
      const expiringConversations = await this.conversationModel.findAll({
        include: [
          {
            model: Company,
            as: 'company',
            where: { is_active: true },
          },
        ],
        where: {
          is_active: true,
          session_expires_at: {
            [Op.and]: [
              { [Op.lte]: today }, // Not newer than today end
              { [Op.gt]: twoDaysAgo }, // Not expired more than 2 days ago
            ],
          },
        },
      });

      this.logger.log(
        `Found ${expiringConversations.length} conversations eligible for renewal`,
      );

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const conversation of expiringConversations) {
        try {
          // Check if the conversation window is still active with WhatsApp
          const isWindowActive = await this.isConversationWindowActive(
            conversation.phone_number,
            conversation.company.name,
          );

          if (isWindowActive) {
            this.logger.log(
              `Conversation ${conversation.id} for ${conversation.phone_number} still has active window, skipping template send`,
            );
            skippedCount++;
            continue;
          }

          // Send inicio_conversacion template
          const templateResult = await this.whatsappService.startConversation(
            conversation.company.name,
            {
              to: conversation.phone_number,
              templateName: 'inicio_conversacion',
              parameters: [conversation.company.name], // Default parameter
              language: conversation.context?.language || 'es',
            },
          );

          if (templateResult.status === 'success') {
            this.logger.log(
              `Successfully sent inicio_conversacion template to ${conversation.phone_number} for conversation ${conversation.id}`,
            );
            successCount++;
          } else {
            this.logger.warn(
              `Template send was skipped for ${conversation.phone_number}: ${templateResult.message}`,
            );
            skippedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Error processing conversation ${conversation.id} for ${conversation.phone_number}: ${error.message}`,
            error.stack,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Conversation expiry check completed. Success: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        'Error during conversation expiry check',
        error.stack,
      );
    }
  }

  /**
   * Check if a conversation window is still active with WhatsApp
   * Uses WhatsApp Business API to validate messaging status
   */
  private async isConversationWindowActive(
    phoneNumber: string,
    companyName: string,
  ): Promise<boolean> {
    try {
      // First check our local conversation status
      const conversation = await this.conversationModel.findOne({
        include: [
          {
            model: Company,
            as: 'company',
            where: { name: companyName },
          },
        ],
        where: {
          phone_number: phoneNumber,
          is_active: true,
        },
      });

      if (!conversation || !conversation.session_expires_at) {
        this.logger.log(
          `No local conversation found for ${phoneNumber}, assuming window is inactive`,
        );
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(conversation.session_expires_at);

      // If session has already expired locally, don't bother checking WhatsApp API
      if (expiresAt <= now) {
        this.logger.log(
          `Conversation for ${phoneNumber} expired locally at ${expiresAt.toISOString()}, window is inactive`,
        );
        return false;
      }

      // Check with WhatsApp API to validate messaging capability
      const windowStatus = await this.whatsappService.checkConversationWindowStatus(
        companyName,
        phoneNumber,
      );

      this.logger.log(
        `WhatsApp API check for ${phoneNumber}: ${windowStatus.canSendMessage} (Active: ${windowStatus.isActive})`,
      );

      return windowStatus.isActive;
    } catch (error) {
      this.logger.error(
        `Error checking conversation window status for ${phoneNumber}: ${error.message}`,
      );
      // If we can't determine status, assume it's inactive to be safe
      return false;
    }
  }

  /**
   * Manual method to trigger conversation expiry check (for testing)
   */
  async triggerExpiryCheck(): Promise<{
    status: string;
    message: string;
  }> {
    this.logger.log('Manually triggering conversation expiry check...');
    
    try {
      await this.handleConversationExpiry();
      return {
        status: 'success',
        message: 'Conversation expiry check completed successfully',
      };
    } catch (error) {
      this.logger.error('Manual expiry check failed', error.stack);
      return {
        status: 'error',
        message: `Expiry check failed: ${error.message}`,
      };
    }
  }
} 