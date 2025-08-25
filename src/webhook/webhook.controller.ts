import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { HttpService } from '../http';
import { ConfigService } from '../config';
import { WebhookPayload, WebhookVerificationDto } from '../dto/webhook.dto';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET endpoint for webhook verification
   * WhatsApp sends a GET request to verify the webhook endpoint
   */
  @Get()
  async verifyWebhook(@Query() query: WebhookVerificationDto): Promise<string> {
    this.logger.log('Webhook verification request received', {
      mode: query['hub.mode'],
      token: query['hub.verify_token'],
      challenge: query['hub.challenge'],
    });

    try {
      const challenge = await this.httpService.verifyWebhook(
        query['hub.mode'],
        query['hub.verify_token'],
        query['hub.challenge'],
      );

      this.logger.log('Webhook verification successful');
      return challenge;
    } catch (error) {
      this.logger.error('Webhook verification failed:', error);
      throw new UnauthorizedException('Webhook verification failed');
    }
  }

  /**
   * POST endpoint for receiving webhook notifications
   * WhatsApp sends POST requests with message updates and status changes
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Body() payload: WebhookPayload,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ status: string }> {
    this.logger.log('Webhook notification received', {
      object: payload.object,
      entryCount: payload.entry?.length || 0,
      hasSignature: !!signature,
    });

    // Verify webhook signature for security (optional but recommended)
    if (
      signature &&
      this.configService.webhookSecret &&
      this.configService.webhookSecret !== 'your_webhook_secret_here'
    ) {
      const isValid = this.webhookService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        this.configService.webhookSecret,
      );

      if (!isValid) {
        this.logger.warn(
          'Invalid webhook signature - continuing without verification',
        );
        // Don't throw error, just log warning and continue
      }
    } else {
      this.logger.warn(
        'Webhook signature verification skipped - no valid secret configured',
      );
    }

    // Validate payload structure
    if (!payload.object || !payload.entry || !Array.isArray(payload.entry)) {
      this.logger.warn('Invalid webhook payload structure');
      throw new BadRequestException('Invalid webhook payload');
    }

    try {
      // Process the webhook asynchronously
      // We don't await this to avoid blocking the response to WhatsApp
      setImmediate(async () => {
        try {
          await this.webhookService.processWebhook(payload);
        } catch (error) {
          this.logger.error('Error processing webhook:', error);
        }
      });

      this.logger.log('Webhook processed successfully');
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Failed to process webhook:', error);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Health check endpoint for webhook service
   */
  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
