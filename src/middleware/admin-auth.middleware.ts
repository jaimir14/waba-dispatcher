import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {

  use(req: Request, res: Response, next: NextFunction) {
    const adminApiKey = req.headers['x-admin-key'] as string;

    if (!adminApiKey) {
      throw new UnauthorizedException('X-Admin-Key header is required for company management');
    }

    // Get admin key from environment or config
    const validAdminKey = process.env.ADMIN_API_KEY;

    if (adminApiKey !== validAdminKey) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    // Add admin context to request
    (req as any).isAdmin = true;
    (req as any).adminKey = adminApiKey;

    next();
  }
} 