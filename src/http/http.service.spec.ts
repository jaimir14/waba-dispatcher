import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from './http.service';
import { ConfigService } from '../config';
import axios from 'axios';
import { AxiosResponse } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpService', () => {
  let service: HttpService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockAxiosInstance: any;

  const mockConfig = {
    appName: 'waba-dispatcher',
    metaAccessToken: 'test_access_token',
    metaVerifyToken: 'test_verify_token',
  };

  beforeEach(async () => {
    mockConfigService = {
      appName: mockConfig.appName,
      metaAccessToken: mockConfig.metaAccessToken,
      metaVerifyToken: mockConfig.metaVerifyToken,
    } as any;

    // Mock axios instance
    mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create axios instance with correct configuration', () => {
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://graph.facebook.com/v18.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${mockConfig.appName}/1.0.0`,
      },
    });
  });

  it('should setup request and response interceptors', () => {
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  describe('WhatsApp API Methods', () => {
    it('should send message with correct parameters', async () => {
      const phoneNumberId = 'test_phone_id';
      const messageData = { text: 'Hello World' };
      const mockResponse: AxiosResponse = {
        data: { message_id: 'test_message_id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await service.sendMessage(phoneNumberId, messageData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/${phoneNumberId}/messages`,
        messageData,
        {
          params: {
            access_token: mockConfig.metaAccessToken,
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get message status with correct parameters', async () => {
      const messageId = 'test_message_id';
      const mockResponse: AxiosResponse = {
        data: { status: 'delivered' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.getMessageStatus(messageId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/${messageId}`, {
        params: {
          access_token: mockConfig.metaAccessToken,
          fields: 'status,error',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should verify webhook successfully with valid token', async () => {
      const mode = 'subscribe';
      const token = mockConfig.metaVerifyToken;
      const challenge = 'test_challenge';

      const result = await service.verifyWebhook(mode, token, challenge);

      expect(result).toBe(challenge);
    });

    it('should throw error for invalid webhook verification', async () => {
      const mode = 'subscribe';
      const token = 'invalid_token';
      const challenge = 'test_challenge';

      // Mock logger to prevent error from being logged during test
      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      await expect(
        service.verifyWebhook(mode, token, challenge),
      ).rejects.toThrow('Webhook verification failed');

      // Restore logger
      loggerErrorSpy.mockRestore();
    });
  });

  describe('Generic HTTP Methods', () => {
    it('should call axios get method', async () => {
      const url = '/test';
      const mockResponse: AxiosResponse = { data: 'test', status: 200 } as any;
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.get(url);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(url, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should call axios post method', async () => {
      const url = '/test';
      const data = { test: 'data' };
      const mockResponse: AxiosResponse = { data: 'test', status: 200 } as any;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await service.post(url, data);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(url, data, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should call axios put method', async () => {
      const url = '/test';
      const data = { test: 'data' };
      const mockResponse: AxiosResponse = { data: 'test', status: 200 } as any;
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const result = await service.put(url, data);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(url, data, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should call axios delete method', async () => {
      const url = '/test';
      const mockResponse: AxiosResponse = { data: 'test', status: 200 } as any;
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await service.delete(url);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(url, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should call axios patch method', async () => {
      const url = '/test';
      const data = { test: 'data' };
      const mockResponse: AxiosResponse = { data: 'test', status: 200 } as any;
      mockAxiosInstance.patch.mockResolvedValue(mockResponse);

      const result = await service.patch(url, data);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        url,
        data,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
