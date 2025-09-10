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

export class GetPhoneNumberStatsDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  startDate?: string; // Format: "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  endDate?: string; // Format: "YYYY-MM-DD"
}

export class PhoneNumberStatsDto {
  phoneNumber: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  deliveredMessages: number;
  readMessages: number;
  lastMessageSent: string | null;
  averageResponseTime: number | null; // in milliseconds
  totalCost: number; // 4 decimal places precision
  currency: string;
  period: {
    startDate: string | 'all';
    endDate: string | 'all';
  };
  messageBreakdown: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  costBreakdown: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export class PhoneNumberStatsResponseDto {
  status: 'success' | 'failed';
  message: string;
  data?: PhoneNumberStatsDto;
}

export class GetAllPhoneNumberStatsDto {
  @IsOptional()
  @IsString()
  startDate?: string; // Format: "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  endDate?: string; // Format: "YYYY-MM-DD"
}

export class AllPhoneNumberStatsDto {
  companyName: string;
  totalPhoneNumbers: number;
  totalStats: {
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    deliveredMessages: number;
    readMessages: number;
    templateMessages: number;
    totalCost: number;
    messageBreakdown: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
    costBreakdown: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
  };
  phoneNumbers: Array<{
    phoneNumber: string;
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    deliveredMessages: number;
    readMessages: number;
    templateMessages: number;
    lastMessageSent: string | null;
    averageResponseTime: number | null;
    totalCost: number;
    messageBreakdown: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
    costBreakdown: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
  }>;
  currency: string;
  period: {
    startDate: string | 'all';
    endDate: string | 'all';
  };
}

export class AllPhoneNumberStatsResponseDto {
  status: 'success' | 'failed';
  message: string;
  data?: AllPhoneNumberStatsDto;
}
