import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class NumberAmount {
  @IsString()
  @IsNotEmpty()
  number: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reventadoAmount?: number; // R amount for reventados
}

export class SendListMessageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  listName: string;

  @IsString()
  @IsNotEmpty()
  reporter: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NumberAmount)
  numbers: NumberAmount[];

  @IsOptional()
  @IsString()
  customMessage?: string; // Optional custom message to append
}

export class SendListMessageResponseDto {
  status: 'success' | 'failed' | 'partial';
  message: string;
  results: Array<{
    recipient: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
  }>;
  totalAmount: number;
  currency: string;
  normalTotal?: number; // For reventados format
  reventadosTotal?: number; // For reventados format
  isReventados?: boolean; // Indicates if this is a reventados format
}
