import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CompanyStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class CompanyResponseDto {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export class CompanyListResponseDto {
  status: 'success' | 'failed';
  message: string;
  data?: CompanyResponseDto[];
  total?: number;
}

export class CompanySingleResponseDto {
  status: 'success' | 'failed';
  message: string;
  data?: CompanyResponseDto;
}

export class CompanyDeleteResponseDto {
  status: 'success' | 'failed';
  message: string;
}

export class GetCompaniesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'deletedAt' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
} 