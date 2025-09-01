import {
  IsString,
  IsArray,
  IsNotEmpty,
  ArrayNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @IsString()
  @IsNotEmpty()
  language: string = 'es';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parameters?: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipients: string[];
}

export class SendInformationalMessageDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['text', 'template'])
  @IsOptional()
  type: 'text' | 'template' = 'text';
}

export class SendMessageResponseDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  results: MessageResultDto[];
}

export class SendInformationalMessageResponseDto {
  @IsString()
  @IsNotEmpty()
  status: 'success' | 'failed' | 'partial';

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsArray()
  results?: MessageResultDto[];
}

export class MessageResultDto {
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  status: 'sent' | 'failed';

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  error?: string;
}
