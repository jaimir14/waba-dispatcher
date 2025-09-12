import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CompanyRepository } from '../database/repositories/company.repository';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async use(req: Request, res: Response, next: NextFunction) {
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

    const company = await this.companyRepository.findByApiKey(apiKey);
    // Add company context to request
    (req as any).companyId = company.name;
    (req as any).apiKey = apiKey;

    next();
  }

  private isValidApiKey(apiKey: string): boolean {
    // Basic validation: should be alphanumeric and at least 32 characters
    return /^[a-zA-Z0-9_]{32,}$/.test(apiKey);
  }

  private extractCompanyId(apiKey: string): string {
    // Extract company ID from API key (first part before underscore)
    const parts: string[] = apiKey.split('_');
    parts.slice(0, -1);
    return parts.join('_') || 'unknown';
  }
}
