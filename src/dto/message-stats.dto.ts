import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class GetMessageStatsDto {
  @IsString()
  @IsNotEmpty()
  month: string; // Format: "YYYY-MM"

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  year?: number; // Optional, can be extracted from month
}

export class MessageStatsResponseDto {
  status: 'success' | 'failed';
  message: string;
  data?: {
    companyName: string;
    month: string;
    totalMessages: number;
    totalCost: number; // 4 decimal places precision
    currency: string;
    messageBreakdown: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
    costBreakdown: {
      sent: number; // 4 decimal places precision
      delivered: number; // 4 decimal places precision
      read: number; // 4 decimal places precision
      failed: number; // 4 decimal places precision
    };
  };
}
