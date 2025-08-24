import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyMiddleware } from './api-key.middleware';
import { ConfigService } from '../config';
import { Request, Response, NextFunction } from 'express';

describe('ApiKeyMiddleware', () => {
  let middleware: ApiKeyMiddleware;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    mockConfigService = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyMiddleware,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    middleware = module.get<ApiKeyMiddleware>(ApiKeyMiddleware);

    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should throw UnauthorizedException when X-API-Key header is missing', () => {
    expect(() => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );
    }).toThrow(UnauthorizedException);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when API key format is invalid', () => {
    mockRequest.headers = { 'x-api-key': 'invalid-key' };

    expect(() => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );
    }).toThrow(UnauthorizedException);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should pass validation and call next() with valid API key', () => {
    const validApiKey = 'company123_abcdefghijklmnopqrstuvwxyz123456';
    mockRequest.headers = { 'x-api-key': validApiKey };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockRequest as any).companyId).toBe('company123');
    expect((mockRequest as any).apiKey).toBe(validApiKey);
  });

  it('should extract company ID correctly from API key', () => {
    const apiKey = 'acme_corp_abcdefghijklmnopqrstuvwxyz123456';
    mockRequest.headers = { 'x-api-key': apiKey };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).companyId).toBe('acme');
  });

  it('should handle API key without underscore separator', () => {
    const apiKey = 'abcdefghijklmnopqrstuvwxyz123456789';
    mockRequest.headers = { 'x-api-key': apiKey };

    middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

    expect((mockRequest as any).companyId).toBe(
      'abcdefghijklmnopqrstuvwxyz123456789',
    );
  });
});
