import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class StartConversationDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  templateName: string;

  @IsArray()
  @IsOptional()
  parameters?: string[];

  @IsString()
  @IsOptional()
  language?: string;
}

export class StartConversationResponseDto {
  status: 'success' | 'failed';
  message: string;
  conversationId: string;
  messageId?: string;
}

export class GetConversationDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class GetConversationResponseDto {
  status: 'success' | 'not_found';
  conversation?: {
    id: string;
    phoneNumber: string;
    currentStep: string;
    isActive: boolean;
    lastMessageAt: string;
    context: Record<string, any>;
  };
}
