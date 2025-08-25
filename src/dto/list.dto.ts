import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { ListStatus } from '../database/models/list.model';

export class CreateListDto {
  @IsString()
  list_id: string;

  @IsUUID()
  conversation_id: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateListStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(ListStatus)
  status: ListStatus;
}

export class ListResponseDto {
  id: string;
  conversation_id: string;
  list_id: string;
  status: ListStatus;
  accepted_at?: Date;
  rejected_at?: Date;
  expired_at?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export class ListQueryDto {
  @IsOptional()
  @IsUUID()
  conversation_id?: string;

  @IsOptional()
  @IsEnum(ListStatus)
  status?: ListStatus;

  @IsOptional()
  @IsString()
  list_id?: string;
} 