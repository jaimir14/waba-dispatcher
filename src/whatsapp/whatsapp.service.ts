import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { HttpService } from '../http/http.service';
import { MessageRepository } from '../database/repositories/message.repository';
import { CompanyRepository } from '../database/repositories/company.repository';
import { Message, MessageStatus } from '../database/models/message.model';
import { Conversation } from '../database/models/conversation.model';
import { InjectModel } from '@nestjs/sequelize';
import {
  CreateTemplateMessageDto,
  WhatsAppTemplateMessageDto,
  TemplateDto,
  TextParameter,
  SendMessageDto,
  SendMessageResponseDto,
  MessageResultDto,
  SendTextMessageDto,
  SendTextMessageResponseDto,
  StartConversationDto,
  StartConversationResponseDto,
  GetConversationDto,
  GetConversationResponseDto,
} from '../dto';
import { QueueService, WhatsAppSendJobData } from '../queue/queue.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly messageRepository: MessageRepository,
    private readonly companyRepository: CompanyRepository,
    @InjectModel(Conversation)
    private readonly conversationModel: typeof Conversation,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService,
  ) {}

  /**
   * Send a WhatsApp template message
   */
  async sendTemplateMessage(
    companyId: string,
    createMessageDto: CreateTemplateMessageDto,
  ): Promise<Message> {
    this.logger.log(
      `Sending template message to ${createMessageDto.to} for company ${companyId}`,
    );

    // Get company credentials
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new BadRequestException(`Company ${companyId} not found`);
    }

    if (!company.isActive) {
      throw new BadRequestException(`Company ${companyId} is not active`);
    }

    // Create message record in database
    const message = await this.messageRepository.create({
      company_id: companyId,
      to_phone_number: createMessageDto.to,
      template_name: createMessageDto.template_name,
      parameters: createMessageDto.parameters || [],
      status: MessageStatus.PENDING,
    });

    try {
      // Prepare WhatsApp API payload
      const whatsappPayload = this.buildWhatsAppPayload(createMessageDto);

      // Send message to WhatsApp API
      const response = await this.httpService.sendMessage(
        company.settings?.metaPhoneNumberId ||
          this.configService.metaPhoneNumberId,
        whatsappPayload,
      );

      // Update message with WhatsApp ID and mark as sent
      const responseData = response.data;
      await this.messageRepository.updateWhatsAppId(
        message.id,
        responseData.messages[0].id,
      );
      await this.messageRepository.updateStatus(message.id, MessageStatus.SENT);

      this.logger.log(
        `Message ${message.id} sent successfully. WhatsApp ID: ${responseData.messages[0].id}`,
      );

      return message;
    } catch (error) {
      this.logger.error(
        `Failed to send message ${message.id}: ${error.message}`,
        error.stack,
      );

      // Mark message as failed
      await this.messageRepository.markAsFailed(
        message.id,
        error.response?.data?.error?.code || 'UNKNOWN_ERROR',
        error.response?.data?.error?.message || error.message,
      );

      throw error;
    }
  }

  /**
   * Build WhatsApp API payload from DTO and company credentials
   */
  private buildWhatsAppPayload(
    createMessageDto: CreateTemplateMessageDto,
  ): WhatsAppTemplateMessageDto {
    const template = new TemplateDto(createMessageDto.template_name);

    // Add parameters if provided
    if (createMessageDto.parameters && createMessageDto.parameters.length > 0) {
      template.components = createMessageDto.parameters.map((param) => {
        if (param.type === 'text') {
          return new TextParameter({ text: param.text });
        }
        // For now, only text parameters are supported
        throw new BadRequestException(
          `Parameter type ${param.type} is not supported`,
        );
      });
    }

    return {
      messaging_product: 'whatsapp',
      to: createMessageDto.to,
      type: 'template',
      template,
    };
  }

  /**
   * Get message status from WhatsApp API
   */
  async getMessageStatus(whatsappMessageId: string): Promise<any> {
    this.logger.log(`Getting status for message: ${whatsappMessageId}`);

    try {
      const status = await this.httpService.getMessageStatus(whatsappMessageId);

      // Update local message status
      const message =
        await this.messageRepository.findByWhatsAppId(whatsappMessageId);

      if (message) {
        await this.updateMessageStatusFromWhatsApp(message, status);
      }

      return status;
    } catch (error) {
      this.logger.error(
        `Failed to get status for message ${whatsappMessageId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update message status based on WhatsApp webhook data
   */
  async updateMessageStatusFromWhatsApp(
    message: Message,
    whatsappStatus: any,
  ): Promise<void> {
    const status = whatsappStatus.status;
    let newStatus: MessageStatus;
    let additionalData: Partial<Message> = {};

    switch (status) {
      case 'sent':
        newStatus = MessageStatus.SENT;
        break;
      case 'delivered':
        newStatus = MessageStatus.DELIVERED;
        break;
      case 'read':
        newStatus = MessageStatus.READ;
        break;
      case 'failed':
        newStatus = MessageStatus.FAILED;
        additionalData = {
          error_code: whatsappStatus.error?.code,
          error_message: whatsappStatus.error?.message,
        };
        break;
      default:
        this.logger.warn(`Unknown WhatsApp status: ${status}`);
        return;
    }

    await this.messageRepository.updateStatus(
      message.id,
      newStatus,
      additionalData,
    );

    this.logger.log(`Message ${message.id} status updated to ${newStatus}`);
  }

  /**
   * Get message by ID
   */
  async getMessage(id: number): Promise<Message | null> {
    return this.messageRepository.findById(id);
  }

  /**
   * Get messages by company
   */
  async getCompanyMessages(companyId: string): Promise<Message[]> {
    return this.messageRepository.findByCompanyId(companyId);
  }

  /**
   * Get messages by status
   */
  async getMessagesByStatus(status: MessageStatus): Promise<Message[]> {
    return this.messageRepository.findByStatus(status);
  }

  /**
   * Get pending messages
   */
  async getPendingMessages(): Promise<Message[]> {
    return this.messageRepository.getPendingMessages();
  }

  /**
   * Get failed messages
   */
  async getFailedMessages(): Promise<Message[]> {
    return this.messageRepository.getFailedMessages();
  }

  /**
   * Retry failed message
   */
  async retryMessage(messageId: number): Promise<Message> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new BadRequestException(`Message ${messageId} not found`);
    }

    if (message.status !== MessageStatus.FAILED) {
      throw new BadRequestException(
        `Message ${messageId} is not in failed status`,
      );
    }

    // Reset status to pending
    await this.messageRepository.updateStatus(messageId, MessageStatus.PENDING);

    // Create new DTO for retry
    const createMessageDto = new CreateTemplateMessageDto();
    createMessageDto.to = message.to_phone_number;
    createMessageDto.template_name = message.template_name;
    createMessageDto.parameters = message.parameters as any[];

    // Send message again
    return this.sendTemplateMessage(message.company_id, createMessageDto);
  }

  /**
   * Send messages to multiple recipients
   */
  async sendMessageToMultipleRecipients(
    companyId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    this.logger.log(
      `Sending template message "${sendMessageDto.templateName}" to ${sendMessageDto.recipients.length} recipients for company ${companyId}`,
    );

    const results: MessageResultDto[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each recipient
    for (const recipient of sendMessageDto.recipients) {
      try {
        // Create template message DTO for each recipient
        const createMessageDto = new CreateTemplateMessageDto();
        createMessageDto.to = recipient;
        createMessageDto.template_name = sendMessageDto.templateName;
        createMessageDto.parameters = sendMessageDto.parameters?.map(
          (param) => new TextParameter({ text: param }),
        );

        // Send message to individual recipient
        const message = await this.sendTemplateMessage(
          companyId,
          createMessageDto,
        );

        results.push({
          recipient,
          status: 'sent',
          messageId: message.id.toString(),
        });

        successCount++;
        this.logger.log(`Message sent successfully to ${recipient}`);
      } catch (error) {
        results.push({
          recipient,
          status: 'failed',
          error: error.message || 'Unknown error',
        });

        failureCount++;
        this.logger.error(
          `Failed to send message to ${recipient}: ${error.message}`,
        );
      }
    }

    const response: SendMessageResponseDto = {
      status:
        failureCount === 0
          ? 'success'
          : failureCount === sendMessageDto.recipients.length
            ? 'failed'
            : 'partial',
      message: `Sent to ${successCount}/${sendMessageDto.recipients.length} recipients`,
      results,
    };

    this.logger.log(
      `Batch send completed: ${successCount} success, ${failureCount} failed`,
    );

    return response;
  }

  /**
   * Send messages to multiple recipients using queue (asynchronous)
   */
  async sendMessageToMultipleRecipientsQueued(
    companyId: string,
    sendMessageDto: SendMessageDto,
    priority: number = 0,
  ): Promise<SendMessageResponseDto> {
    this.logger.log(
      `Queueing template message "${sendMessageDto.templateName}" to ${sendMessageDto.recipients.length} recipients for company ${companyId}`,
    );

    const results: MessageResultDto[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each recipient
    for (const recipient of sendMessageDto.recipients) {
      try {
        const jobData: WhatsAppSendJobData = {
          companyId,
          to: recipient,
          templateName: sendMessageDto.templateName,
          parameters: sendMessageDto.parameters,
          priority,
        };

        await this.queueService.addWhatsAppSendJob(jobData);

        results.push({
          recipient,
          status: 'sent' as const,
          messageId: 'queued',
        });

        successCount++;
        this.logger.log(`Message queued successfully for ${recipient}`);
      } catch (error) {
        results.push({
          recipient,
          status: 'failed' as const,
          error: error.message || 'Failed to queue message',
        });

        failureCount++;
        this.logger.error(
          `Failed to queue message for ${recipient}: ${error.message}`,
        );
      }
    }

    const response: SendMessageResponseDto = {
      status:
        failureCount === 0
          ? 'success'
          : failureCount === sendMessageDto.recipients.length
            ? 'failed'
            : 'partial',
      message: `Queued ${successCount}/${sendMessageDto.recipients.length} recipients`,
      results,
    };

    this.logger.log(
      `Batch queue completed: ${successCount} success, ${failureCount} failed`,
    );

    return response;
  }

  /**
   * Send messages to multiple recipients using bulk queue operation
   */
  async sendMessageToMultipleRecipientsBulkQueued(
    companyId: string,
    sendMessageDto: SendMessageDto,
    priority: number = 0,
  ): Promise<SendMessageResponseDto> {
    this.logger.log(
      `Bulk queueing template message "${sendMessageDto.templateName}" to ${sendMessageDto.recipients.length} recipients for company ${companyId}`,
    );

    try {
      const jobs = sendMessageDto.recipients.map((recipient) => ({
        data: {
          companyId,
          to: recipient,
          templateName: sendMessageDto.templateName,
          parameters: sendMessageDto.parameters,
          priority,
        } as WhatsAppSendJobData,
      }));

      await this.queueService.addBulkWhatsAppSendJobs(jobs);

      const results: MessageResultDto[] = sendMessageDto.recipients.map(
        (recipient) => ({
          recipient,
          status: 'sent' as const,
          messageId: 'queued',
        }),
      );

      const response: SendMessageResponseDto = {
        status: 'success',
        message: `Bulk queued ${sendMessageDto.recipients.length}/${sendMessageDto.recipients.length} recipients`,
        results,
      };

      this.logger.log(
        `Bulk queue completed: ${sendMessageDto.recipients.length} jobs queued`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to bulk queue messages: ${error.message}`);

      const results: MessageResultDto[] = sendMessageDto.recipients.map(
        (recipient) => ({
          recipient,
          status: 'failed' as const,
          error: 'Failed to queue message',
        }),
      );

      return {
        status: 'failed',
        message: `Failed to queue 0/${sendMessageDto.recipients.length} recipients`,
        results,
      };
    }
  }

  /**
   * Start a conversation with a template message
   */
  async startConversation(
    companyId: string,
    startConversationDto: StartConversationDto,
  ): Promise<StartConversationResponseDto> {
    this.logger.log(
      `Starting conversation with ${startConversationDto.to} for company ${companyId}`,
    );

    // Get company credentials
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new BadRequestException(`Company ${companyId} not found`);
    }

    if (!company.isActive) {
      throw new BadRequestException(`Company ${companyId} is not active`);
    }

    // Create or get conversation
    const conversation = await this.conversationModel.findOrCreate({
      where: {
        company_id: companyId,
        phone_number: startConversationDto.to,
        is_active: true,
      },
      defaults: {
        company_id: companyId,
        phone_number: startConversationDto.to,
        current_step: 'waiting_confirmation',
        context: {
          templateName: startConversationDto.templateName,
          parameters: startConversationDto.parameters,
          language: startConversationDto.language || 'es',
          startedAt: new Date().toISOString(),
        },
        last_message_at: new Date(),
        is_active: true,
      },
    });

    // Create template message DTO
    const createMessageDto = new CreateTemplateMessageDto();
    createMessageDto.to = startConversationDto.to;
    createMessageDto.template_name = startConversationDto.templateName;
    createMessageDto.parameters = startConversationDto.parameters?.map(
      (param) => new TextParameter({ text: param }),
    );

    try {
      // Send template message
      const message = await this.sendTemplateMessage(companyId, createMessageDto);

      this.logger.log(
        `Conversation started successfully. Conversation ID: ${conversation[0].id}, Message ID: ${message.id}`,
      );

      return {
        status: 'success',
        message: 'Conversation started successfully',
        conversationId: conversation[0].id,
        messageId: message.id.toString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to start conversation: ${error.message}`,
        error.stack,
      );

      return {
        status: 'failed',
        message: `Failed to start conversation: ${error.message}`,
        conversationId: conversation[0].id,
      };
    }
  }

  /**
   * Send text message (non-template) to confirmed conversation
   */
  async sendTextMessage(
    companyId: string,
    sendTextMessageDto: SendTextMessageDto,
  ): Promise<SendTextMessageResponseDto> {
    this.logger.log(
      `Sending text message to ${sendTextMessageDto.to} for company ${companyId}`,
    );

    // Get company credentials
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new BadRequestException(`Company ${companyId} not found`);
    }

    if (!company.isActive) {
      throw new BadRequestException(`Company ${companyId} is not active`);
    }

    // Check if conversation exists and is confirmed
    const conversation = await this.conversationModel.findOne({
      where: {
        company_id: companyId,
        phone_number: sendTextMessageDto.to,
        is_active: true,
      },
    });

    if (!conversation) {
      return {
        status: 'conversation_not_confirmed',
        message: 'No active conversation found for this phone number',
      };
    }

    if (conversation.current_step !== 'confirmed') {
      return {
        status: 'conversation_not_confirmed',
        message: 'Conversation is not confirmed. Only confirmed conversations can receive text messages.',
      };
    }

    // Create message record in database
    const message = await this.messageRepository.create({
      company_id: companyId,
      to_phone_number: sendTextMessageDto.to,
      template_name: null, // No template for text messages
      parameters: null,
      status: MessageStatus.PENDING,
    });

    try {
      // Prepare WhatsApp API payload for text message
      const whatsappPayload = {
        messaging_product: 'whatsapp',
        to: sendTextMessageDto.to,
        type: 'text',
        text: {
          body: sendTextMessageDto.message,
        },
      };

      // Send message to WhatsApp API
      const response = await this.httpService.sendMessage(
        company.settings?.metaPhoneNumberId ||
          this.configService.metaPhoneNumberId,
        whatsappPayload,
      );

      // Update message with WhatsApp ID and mark as sent
      const responseData = response.data;
      await this.messageRepository.updateWhatsAppId(
        message.id,
        responseData.messages[0].id,
      );
      await this.messageRepository.updateStatus(message.id, MessageStatus.SENT);

      this.logger.log(
        `Text message ${message.id} sent successfully. WhatsApp ID: ${responseData.messages[0].id}`,
      );

      return {
        status: 'success',
        message: 'Text message sent successfully',
        messageId: message.id.toString(),
        conversationId: conversation.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send text message ${message.id}: ${error.message}`,
        error.stack,
      );

      // Mark message as failed
      await this.messageRepository.markAsFailed(
        message.id,
        error.response?.data?.error?.code || 'UNKNOWN_ERROR',
        error.response?.data?.error?.message || error.message,
      );

      return {
        status: 'failed',
        message: `Failed to send text message: ${error.message}`,
      };
    }
  }

  /**
   * Get conversation by phone number
   */
  async getConversation(
    companyId: string,
    getConversationDto: GetConversationDto,
  ): Promise<GetConversationResponseDto> {
    this.logger.log(
      `Getting conversation for ${getConversationDto.phoneNumber} in company ${companyId}`,
    );

    // Get company credentials
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new BadRequestException(`Company ${companyId} not found`);
    }

    if (!company.isActive) {
      throw new BadRequestException(`Company ${companyId} is not active`);
    }

    // Find conversation
    const conversation = await this.conversationModel.findOne({
      where: {
        company_id: companyId,
        phone_number: getConversationDto.phoneNumber,
        is_active: true,
      },
    });

    if (!conversation) {
      return {
        status: 'not_found',
        message: 'No active conversation found for this phone number',
      };
    }

    return {
      status: 'success',
      conversation: {
        id: conversation.id,
        phoneNumber: conversation.phone_number,
        currentStep: conversation.current_step,
        isActive: conversation.is_active,
        lastMessageAt: conversation.last_message_at.toISOString(),
        context: conversation.context || {},
      },
    };
  }

  /**
   * Get message statistics for a company
   */
  async getCompanyStats(companyId: string, hours: number = 24) {
    const [totalSent, totalDelivered, totalRead, totalFailed] =
      await Promise.all([
        this.messageRepository.countByCompanyAndStatus(
          companyId,
          MessageStatus.SENT,
          hours,
        ),
        this.messageRepository.countByCompanyAndStatus(
          companyId,
          MessageStatus.DELIVERED,
          hours,
        ),
        this.messageRepository.countByCompanyAndStatus(
          companyId,
          MessageStatus.READ,
          hours,
        ),
        this.messageRepository.countByCompanyAndStatus(
          companyId,
          MessageStatus.FAILED,
          hours,
        ),
      ]);

    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      readRate: totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0,
      failureRate: totalSent > 0 ? (totalFailed / totalSent) * 100 : 0,
    };
  }
}
