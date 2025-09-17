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
   * Cron job that runs every 2 hours between 8:00 AM and 6:00 PM
   * Checks for conversations that expire today or expired yesterday
   * and sends inicio_conversacion template if conversation window is inactive
   */
  @Cron('0 8-18/2 * * *', {
    name: 'conversation-expiry-check',
    timeZone: 'America/Mexico_City',
  })
  async handleConversationExpiry(): Promise<void> {
    this.logger.log('Starting conversation expiry check...');

    try {
      const now = new Date();
      const fourHoursFromNow = new Date(now);
      // Now plus 4 hours
      fourHoursFromNow.setHours(fourHoursFromNow.getHours() + 4);

      const yesterdayEnd = new Date(now);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999); // End of yesterday

      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(23, 59, 59, 999);

      const findClause = {
        include: [
          {
            model: Company,
            as: 'company',
            where: { is_active: true },
          },
        ],
        where: {
          is_active: true,
          current_step: {
            [Op.not]: 'welcome',
          },
          session_expires_at: {
            [Op.and]: [{ [Op.lte]: fourHoursFromNow }, { [Op.gt]: twoDaysAgo }],
          },
        },
      };
      console.log('DATES', fourHoursFromNow, twoDaysAgo);
      // Find conversations that:
      // 1. Expire today (session_expires_at between start of today and end of today)
      // 2. Expired yesterday (session_expires_at between start of yesterday and end of yesterday)
      // 3. Are still active
      // 4. Did not expire more than 2 days ago (user rejection threshold)
      const expiringConversations =
        await this.conversationModel.findAll(findClause);

      this.logger.log(
        `Found ${expiringConversations.length} conversations eligible for renewal`,
      );

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const processedPhoneNumbers = new Set<string>();

      for (const conversation of expiringConversations) {
        console.log(
          'PHONE NUMBER',
          conversation.phone_number,
          conversation.company.name,
        );
        try {
          if (process.env.NODE_ENV != 'production') {
            console.log(
              'SENDING MESSAGE',
              conversation.phone_number,
              conversation.company.name,
            );
          }

          if (processedPhoneNumbers.has(conversation.phone_number)) {
            this.logger.log(
              `Conversation ${conversation.id} for ${conversation.phone_number} already processed, skipping`,
            );
            skippedCount++;
            continue;
          }

          processedPhoneNumbers.add(conversation.phone_number);

          // Send inicio_conversacion template
          const templateResult = await this.whatsappService.startConversation(
            conversation.company.name,
            {
              to: conversation.phone_number,
              templateName: 'inactive_session_2',
              parameters: [conversation.company.name], // Default parameter
              language: conversation.context?.language || 'es',
            },
            true,
          );

          if (templateResult.status === 'success') {
            this.logger.log(
              `Successfully sent inactive_session template to ${conversation.phone_number} for conversation ${conversation.id}`,
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
        error.message,
        error.stack,
      );
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
