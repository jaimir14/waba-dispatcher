import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../config';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('X-API-Key header is required');
    }

    // Validate API key format (basic validation)
    if (!this.isValidApiKey(apiKey)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Extract company ID from API key (assuming format: companyId_hash)
    const companyId = this.extractCompanyId(apiKey);

    // Add company context to request
    (req as any).companyId = companyId;
    (req as any).apiKey = apiKey;

    next();
  }

  private isValidApiKey(apiKey: string): boolean {
    // Basic validation: should be alphanumeric and at least 32 characters
    return /^[a-zA-Z0-9_]{32,}$/.test(apiKey);
  }

  private extractCompanyId(apiKey: string): string {
    // Extract company ID from API key (first part before underscore)
    const parts = apiKey.split('_');
    return parts[0] || 'unknown';
  }
}
