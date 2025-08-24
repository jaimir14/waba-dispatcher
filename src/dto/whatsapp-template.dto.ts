import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// Parameter types for template messages
export enum ParameterType {
  TEXT = 'text',
}

// Base parameter interface
export interface BaseParameter {
  type: ParameterType;
}

// Text parameter
export class TextParameter implements BaseParameter {
  @IsEnum(ParameterType)
  type: ParameterType.TEXT = ParameterType.TEXT;

  @IsString()
  @IsNotEmpty()
  text: string;

  constructor(data?: { text: string }) {
    if (data?.text) {
      this.text = data.text;
    }
  }
}

// Union type for all parameters
export type TemplateParameter = TextParameter;

// Template component interface
export interface TemplateComponent {
  type: string;
  parameters?: Array<{
    type: string;
    text: string;
  }>;
}

// Template DTO
export class TemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  language: {
    code: string;
    policy?: string;
  };

  @IsOptional()
  @IsArray()
  components?: TemplateComponent[];

  constructor(name: string, policy?: string) {
    this.name = name;
    this.language = {
      code: 'es',
      policy: policy || 'deterministic',
    };
  }
}

// Template message DTO
export class WhatsAppTemplateMessageDto {
  @IsString()
  @IsNotEmpty()
  messaging_product: string = 'whatsapp';

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  type: string = 'template';

  @IsObject()
  @ValidateNested()
  @Type(() => TemplateDto)
  template: TemplateDto;
}

// Template message response DTO
export class WhatsAppTemplateMessageResponseDto {
  @IsString()
  @IsNotEmpty()
  messaging_product: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ErrorDto)
  errors?: ErrorDto[];
}

// Message DTO
export class MessageDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

// Error DTO
export class ErrorDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsObject()
  error_data?: Record<string, any>;

  @IsOptional()
  @IsString()
  href?: string;
}

// Template message request validation
export class CreateTemplateMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  template_name: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  parameters?: TemplateParameter[];

  @IsOptional()
  @IsString()
  policy?: string;
}

// Template message status DTO
export class TemplateMessageStatusDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsObject()
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ErrorDto)
  errors?: ErrorDto[];
}
