import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WebhookEntryChangeValueStatus {
  @IsString()
  id: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsObject()
  error?: {
    code: number;
    title: string;
    message: string;
    error_data?: any;
  };

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsObject()
  pricing?: {
    billable: number;
    pricing_model: string;
    category: string;
  };
}

export class WebhookEntryChangeValue {
  @IsString()
  messaging_product: string;

  @IsString()
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntryChangeValueStatus)
  statuses?: WebhookEntryChangeValueStatus[];

  @IsOptional()
  @IsArray()
  messages?: any[];

  @IsOptional()
  @IsArray()
  contacts?: any[];
}

export class WebhookEntryChange {
  @IsString()
  value: WebhookEntryChangeValue;

  @IsString()
  field: string;
}

export class WebhookEntry {
  @IsString()
  id: string;

  @IsNumber()
  time: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntryChange)
  changes: WebhookEntryChange[];
}

export class WebhookPayload {
  @IsString()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntry)
  entry: WebhookEntry[];
}

export class WebhookVerificationDto {
  @IsString()
  'hub.mode': string;

  @IsString()
  'hub.verify_token': string;

  @IsString()
  'hub.challenge': string;
}
