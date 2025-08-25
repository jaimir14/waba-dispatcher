import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetMessagesByDayDto {
  @IsString()
  @IsNotEmpty()
  date: string; // Format: "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  status?: string; // Optional filter by status
}

export class MessageDetailDto {
  id: number;
  whatsappMessageId: string;
  toPhoneNumber: string;
  templateName: string | null;
  parameters: any;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  pricing: any;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class GetMessagesByDayResponseDto {
  status: 'success' | 'failed';
  message: string;
  data?: {
    companyName: string;
    date: string;
    totalMessages: number;
    messages: MessageDetailDto[];
    statusBreakdown: {
      pending: number;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
  };
}
