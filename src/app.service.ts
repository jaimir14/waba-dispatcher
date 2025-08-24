import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from './http';
import { ConfigService } from './config';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async testWhatsAppConnection(): Promise<{ status: string; message: string }> {
    try {
      this.logger.log('Testing WhatsApp Cloud API connection...');

      // Validate required configuration
      const requiredConfig = this.validateWhatsAppConfig();
      if (!requiredConfig.isValid) {
        return {
          status: 'error',
          message: `Configuration error: ${requiredConfig.missingFields.join(', ')} are required`,
        };
      }

      // Test 1: Verify access token by making a simple API call
      const phoneNumberId = this.configService.metaPhoneNumberId;
      const testUrl = `/${phoneNumberId}`;

      this.logger.log(
        `Testing API access with phone number ID: ${phoneNumberId}`,
      );

      const response = await this.httpService.get(testUrl, {
        params: {
          access_token: this.configService.metaAccessToken,
          fields:
            'id,display_phone_number,verified_name,code_verification_status,quality_rating',
        },
      });

      // Test 2: Validate response structure
      if (!response.data || !response.data.id) {
        throw new Error('Invalid response from WhatsApp API');
      }

      // Test 3: Check phone number status
      const phoneNumberData = response.data;
      const statusChecks: string[] = [];

      if (phoneNumberData.verified_name) {
        statusChecks.push(`Name: ${phoneNumberData.verified_name}`);
      }

      if (phoneNumberData.display_phone_number) {
        statusChecks.push(`Phone: ${phoneNumberData.display_phone_number}`);
      }

      if (phoneNumberData.code_verification_status) {
        statusChecks.push(
          `Verification: ${phoneNumberData.code_verification_status}`,
        );
      }

      if (phoneNumberData.quality_rating) {
        statusChecks.push(
          `Quality: ${phoneNumberData.quality_rating.quality_score}`,
        );
      }

      const statusMessage =
        statusChecks.length > 0
          ? `Phone number verified. ${statusChecks.join(', ')}`
          : 'Phone number verified';

      this.logger.log('✅ WhatsApp Cloud API connection test successful');

      return {
        status: 'success',
        message: `WhatsApp API connection successful. ${statusMessage}`,
      };
    } catch (error) {
      this.logger.error('WhatsApp connection test failed:', error);

      // Provide specific error messages based on error type
      let errorMessage = 'Failed to connect to WhatsApp API';

      if (error.response) {
        // HTTP error response
        const status = error.response.status;
        const errorData = error.response.data?.error;

        switch (status) {
          case 401:
            errorMessage =
              'Invalid access token. Please check META_ACCESS_TOKEN';
            break;
          case 403:
            errorMessage =
              'Access denied. Check permissions and phone number ID';
            break;
          case 404:
            errorMessage =
              'Phone number ID not found. Check META_PHONE_NUMBER_ID';
            break;
          case 429:
            errorMessage = 'Rate limit exceeded. Please try again later';
            break;
          default:
            errorMessage = `API error (${status}): ${errorData?.message || error.message}`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error: Unable to reach WhatsApp API';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused: Check network connectivity';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout: API request timed out';
      }

      return {
        status: 'error',
        message: errorMessage,
      };
    }
  }

  private validateWhatsAppConfig(): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = [
      { key: 'metaAccessToken', name: 'META_ACCESS_TOKEN' },
      { key: 'metaPhoneNumberId', name: 'META_PHONE_NUMBER_ID' },
    ];

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = this.configService[field.key];
      if (!value || value.trim() === '') {
        missingFields.push(field.name);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}
