import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendTextMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class SendTextMessageResponseDto {
  status: 'success' | 'failed' | 'conversation_not_confirmed';
  message: string;
  messageId?: string;
  conversationId?: string;
}
