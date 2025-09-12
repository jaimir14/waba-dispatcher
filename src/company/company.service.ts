import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CompanyRepository } from '../database/repositories/company.repository';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  GetCompaniesQueryDto,
} from '../dto/company.dto';
import { Company } from '../database/models/company.model';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly companyRepository: CompanyRepository) {}

  /**
   * Create a new company
   */
  async createCompany(createCompanyDto: CreateCompanyDto): Promise<CompanyResponseDto> {
    this.logger.log(`Creating company: ${createCompanyDto.name}`);

    // Check if company name already exists
    const existingCompany = await this.companyRepository.existsByName(createCompanyDto.name);
    if (existingCompany) {
      throw new ConflictException(`Company with name '${createCompanyDto.name}' already exists`);
    }

    // Generate API key
    const apiKey = this.generateApiKey(createCompanyDto.name);

    try {
      const companyData = {
        name: createCompanyDto.name,
        apiKey,
        isActive: createCompanyDto.isActive ?? true,
        settings: createCompanyDto.settings || {},
      };

      const company = await this.companyRepository.create(companyData);
      
      this.logger.log(`Company ${company.name} created successfully with ID: ${company.id}`);
      
      return this.mapToResponseDto(company);
    } catch (error) {
      this.logger.error(`Failed to create company ${createCompanyDto.name}: ${error.message}`);
      throw new BadRequestException(`Failed to create company: ${error.message}`);
    }
  }

  /**
   * Get all companies with filtering and sorting
   */
  async getCompanies(query: GetCompaniesQueryDto): Promise<{
    companies: CompanyResponseDto[];
    total: number;
  }> {
    this.logger.log('Fetching companies with filters');

    try {
      const { companies, total } = await this.companyRepository.findWithFiltersAdvanced({
        search: query.search,
        isActive: query.isActive,
        includeDeleted: query.includeDeleted,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      return {
        companies: companies.map(company => this.mapToResponseDto(company)),
        total,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch companies: ${error.message}`);
      throw new BadRequestException(`Failed to fetch companies: ${error.message}`);
    }
  }

  /**
   * Get company by ID
   */
  async getCompanyById(id: string): Promise<CompanyResponseDto> {
    this.logger.log(`Fetching company by ID: ${id}`);

    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    return this.mapToResponseDto(company);
  }

  /**
   * Update company
   */
  async updateCompany(id: string, updateCompanyDto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    this.logger.log(`Updating company: ${id}`);

    // Check if company exists
    const existingCompany = await this.companyRepository.findById(id);
    if (!existingCompany) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    // Check if new name conflicts with existing companies
    if (updateCompanyDto.name) {
      const nameExists = await this.companyRepository.existsByName(updateCompanyDto.name, id);
      if (nameExists) {
        throw new ConflictException(`Company with name '${updateCompanyDto.name}' already exists`);
      }
    }

    try {
      const updatedCompany = await this.companyRepository.update(id, updateCompanyDto);
      if (!updatedCompany) {
        throw new NotFoundException(`Company with ID '${id}' not found`);
      }

      this.logger.log(`Company ${updatedCompany.name} updated successfully`);
      
      return this.mapToResponseDto(updatedCompany);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to update company ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to update company: ${error.message}`);
    }
  }

  /**
   * Delete company (soft delete)
   */
  async deleteCompany(id: string): Promise<void> {
    this.logger.log(`Deleting company: ${id}`);

    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    try {
      const deleted = await this.companyRepository.delete(id);
      if (!deleted) {
        throw new NotFoundException(`Company with ID '${id}' not found`);
      }

      this.logger.log(`Company ${company.name} deleted successfully`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete company ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to delete company: ${error.message}`);
    }
  }

  /**
   * Activate company
   */
  async activateCompany(id: string): Promise<CompanyResponseDto> {
    this.logger.log(`Activating company: ${id}`);

    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    if (company.isActive) {
      this.logger.log(`Company ${company.name} is already active`);
      return this.mapToResponseDto(company);
    }

    try {
      const activatedCompany = await this.companyRepository.activate(id);
      if (!activatedCompany) {
        throw new NotFoundException(`Company with ID '${id}' not found`);
      }

      this.logger.log(`Company ${activatedCompany.name} activated successfully`);
      
      return this.mapToResponseDto(activatedCompany);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to activate company ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to activate company: ${error.message}`);
    }
  }

  /**
   * Deactivate company
   */
  async deactivateCompany(id: string): Promise<CompanyResponseDto> {
    this.logger.log(`Deactivating company: ${id}`);

    const company = await this.companyRepository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    if (!company.isActive) {
      this.logger.log(`Company ${company.name} is already inactive`);
      return this.mapToResponseDto(company);
    }

    try {
      const deactivatedCompany = await this.companyRepository.deactivate(id);
      if (!deactivatedCompany) {
        throw new NotFoundException(`Company with ID '${id}' not found`);
      }

      this.logger.log(`Company ${deactivatedCompany.name} deactivated successfully`);
      
      return this.mapToResponseDto(deactivatedCompany);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to deactivate company ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to deactivate company: ${error.message}`);
    }
  }

  /**
   * Generate API key for company
   */
  private generateApiKey(companyName: string): string {
    const randomBytes = require('crypto').randomBytes(16).toString('hex');
    const formattedName = companyName.replace(/\s+/g, '_').toLowerCase();
    return `${formattedName}_${randomBytes}`;
  }

  /**
   * Restore a soft deleted company
   */
  async restoreCompany(id: string): Promise<CompanyResponseDto> {
    this.logger.log(`Restoring company: ${id}`);

    try {
      const restoredCompany = await this.companyRepository.restore(id);
      if (!restoredCompany) {
        throw new NotFoundException(`Company with ID '${id}' not found or not deleted`);
      }

      this.logger.log(`Company ${restoredCompany.name} restored successfully`);
      
      return this.mapToResponseDto(restoredCompany);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to restore company ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to restore company: ${error.message}`);
    }
  }

  /**
   * Permanently delete a company
   */
  async permanentDeleteCompany(id: string): Promise<void> {
    this.logger.log(`Permanently deleting company: ${id}`);

    try {
      const deleted = await this.companyRepository.permanentDelete(id);
      if (!deleted) {
        throw new NotFoundException(`Company with ID '${id}' not found`);
      }

      this.logger.log(`Company permanently deleted successfully`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to permanently delete company ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to permanently delete company: ${error.message}`);
    }
  }

  /**
   * Map Company entity to response DTO
   */
  private mapToResponseDto(company: Company): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      apiKey: company.apiKey,
      isActive: company.isActive,
      settings: company.settings,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      deletedAt: company.deletedAt?.toISOString(),
    };
  }
} 