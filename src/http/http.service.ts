import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import axiosRetry from 'axios-retry';

interface RequestMetadata {
  requestId: string;
  startTime: number;
}

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: RequestMetadata;
}

@Injectable()
export class HttpService {
  private readonly logger = new Logger(HttpService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${this.configService.appName}/1.0.0`,
      },
    });

    this.setupRetryLogic();
    this.setupInterceptors();
  }

  private setupRetryLogic(): void {
    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount) => {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        this.logger.warn(`Retrying request (${retryCount}/3) in ${delay}ms`);
        return delay;
      },
      retryCondition: (error) => {
        // Retry on network errors, 5xx server errors, and rate limiting
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status >= 500 && error.response?.status < 600) ||
          error.response?.status === 429
        );
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: ExtendedAxiosRequestConfig) => {
        const requestId = this.generateRequestId();
        config.metadata = { requestId, startTime: Date.now() };

        this.logger.log(
          `🚀 [${requestId}] ${config.method?.toUpperCase()} ${config.url}`,
        );

        if (config.data) {
          this.logger.debug(
            `📤 [${requestId}] Request payload: ${JSON.stringify(config.data)}`,
          );
        }

        if (config.params) {
          this.logger.debug(
            `🔍 [${requestId}] Query params: ${JSON.stringify(config.params)}`,
          );
        }

        return config;
      },
      (error) => {
        this.logger.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const { requestId, startTime } =
          (response.config as ExtendedAxiosRequestConfig).metadata || {};
        const duration = Date.now() - startTime;

        this.logger.log(
          `✅ [${requestId}] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`,
        );

        if (response.data) {
          this.logger.debug(
            `📥 [${requestId}] Response data: ${JSON.stringify(response.data)}`,
          );
        }

        return response;
      },
      (error) => {
        const { requestId, startTime } =
          (error.config as ExtendedAxiosRequestConfig)?.metadata || {};
        const duration = startTime ? Date.now() - startTime : 0;

        if (error.response) {
          this.logger.error(
            `❌ [${requestId}] ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`,
          );
          this.logger.error(
            `📥 [${requestId}] Error response: ${JSON.stringify(error.response.data)}`,
          );
        } else if (error.request) {
          this.logger.error(
            `❌ [${requestId}] Network error: ${error.message} (${duration}ms)`,
          );
        } else {
          this.logger.error(
            `❌ [${requestId}] Request setup error: ${error.message}`,
          );
        }

        return Promise.reject(error);
      },
    );
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // WhatsApp Cloud API specific methods
  async sendMessage(phoneNumberId: string, data: any): Promise<AxiosResponse> {
    const url = `/${phoneNumberId}/messages`;
    const config: AxiosRequestConfig = {
      params: {
        access_token: this.configService.metaAccessToken,
      },
    };

    return this.axiosInstance.post(url, data, config);
  }

  async getMessageStatus(messageId: string): Promise<AxiosResponse> {
    const url = `/${messageId}`;
    const config: AxiosRequestConfig = {
      params: {
        access_token: this.configService.metaAccessToken,
        fields: 'status,error',
      },
    };

    return this.axiosInstance.get(url, config);
  }

  async verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
  ): Promise<string> {
    if (mode === 'subscribe' && token === this.configService.metaVerifyToken) {
      this.logger.log('✅ Webhook verification successful');
      return challenge;
    }

    this.logger.error('❌ Webhook verification failed');
    throw new Error('Webhook verification failed');
  }

  // Generic HTTP methods
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get(url, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post(url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put(url, data, config);
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete(url, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch(url, data, config);
  }
}
