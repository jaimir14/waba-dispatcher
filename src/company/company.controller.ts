import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyStatusDto,
  CompanyListResponseDto,
  CompanySingleResponseDto,
  CompanyDeleteResponseDto,
  GetCompaniesQueryDto,
} from '../dto/company.dto';

@Controller('companies')
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(private readonly companyService: CompanyService) {}

  /**
   * Create a new company
   * POST /companies
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createCompany(
    @Body() createCompanyDto: CreateCompanyDto,
  ): Promise<CompanySingleResponseDto> {
    this.logger.log(`Creating company: ${createCompanyDto.name}`);

    try {
      const company = await this.companyService.createCompany(createCompanyDto);
      
      return {
        status: 'success',
        message: `Company '${company.name}' created successfully`,
        data: company,
      };
    } catch (error) {
      this.logger.error(`Failed to create company: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Get all companies with filtering
   * GET /companies
   */
  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getCompanies(
    @Query() query: GetCompaniesQueryDto,
  ): Promise<CompanyListResponseDto> {
    this.logger.log('Fetching companies');

    try {
      const { companies, total } = await this.companyService.getCompanies(query);
      
      return {
        status: 'success',
        message: `Retrieved ${companies.length} companies`,
        data: companies,
        total,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch companies: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Get company by ID
   * GET /companies/:id
   */
  @Get(':id')
  async getCompanyById(@Param('id') id: string): Promise<CompanySingleResponseDto> {
    this.logger.log(`Fetching company by ID: ${id}`);

    try {
      const company = await this.companyService.getCompanyById(id);
      
      return {
        status: 'success',
        message: `Company '${company.name}' retrieved successfully`,
        data: company,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch company ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Update company
   * PUT /companies/:id
   */
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateCompany(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanySingleResponseDto> {
    this.logger.log(`Updating company: ${id}`);

    try {
      const company = await this.companyService.updateCompany(id, updateCompanyDto);
      
      return {
        status: 'success',
        message: `Company '${company.name}' updated successfully`,
        data: company,
      };
    } catch (error) {
      this.logger.error(`Failed to update company ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Delete company (soft delete)
   * DELETE /companies/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteCompany(@Param('id') id: string): Promise<CompanyDeleteResponseDto> {
    this.logger.log(`Deleting company: ${id}`);

    try {
      await this.companyService.deleteCompany(id);
      
      return {
        status: 'success',
        message: 'Company deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete company ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Activate company
   * PATCH /companies/:id/activate
   */
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activateCompany(@Param('id') id: string): Promise<CompanySingleResponseDto> {
    this.logger.log(`Activating company: ${id}`);

    try {
      const company = await this.companyService.activateCompany(id);
      
      return {
        status: 'success',
        message: `Company '${company.name}' activated successfully`,
        data: company,
      };
    } catch (error) {
      this.logger.error(`Failed to activate company ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Deactivate company
   * PATCH /companies/:id/deactivate
   */
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateCompany(@Param('id') id: string): Promise<CompanySingleResponseDto> {
    this.logger.log(`Deactivating company: ${id}`);

    try {
      const company = await this.companyService.deactivateCompany(id);
      
      return {
        status: 'success',
        message: `Company '${company.name}' deactivated successfully`,
        data: company,
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate company ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Update company status (activate/deactivate)
   * PATCH /companies/:id/status
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateCompanyStatus(
    @Param('id') id: string,
    @Body() statusDto: CompanyStatusDto,
  ): Promise<CompanySingleResponseDto> {
    this.logger.log(`Updating company status: ${id} to ${statusDto.isActive ? 'active' : 'inactive'}`);

    try {
      const company = statusDto.isActive
        ? await this.companyService.activateCompany(id)
        : await this.companyService.deactivateCompany(id);
      
      return {
        status: 'success',
        message: `Company '${company.name}' ${statusDto.isActive ? 'activated' : 'deactivated'} successfully`,
        data: company,
      };
    } catch (error) {
      this.logger.error(`Failed to update company status ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Restore a soft deleted company
   * PATCH /companies/:id/restore
   */
  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreCompany(@Param('id') id: string): Promise<CompanySingleResponseDto> {
    this.logger.log(`Restoring company: ${id}`);

    try {
      const company = await this.companyService.restoreCompany(id);
      
      return {
        status: 'success',
        message: `Company '${company.name}' restored successfully`,
        data: company,
      };
    } catch (error) {
      this.logger.error(`Failed to restore company ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }

  /**
   * Permanently delete a company
   * DELETE /companies/:id/permanent
   */
  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  async permanentDeleteCompany(@Param('id') id: string): Promise<CompanyDeleteResponseDto> {
    this.logger.log(`Permanently deleting company: ${id}`);

    try {
      await this.companyService.permanentDeleteCompany(id);
      
      return {
        status: 'success',
        message: 'Company permanently deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to permanently delete company ${id}: ${error.message}`);
      
      return {
        status: 'failed',
        message: error.message,
      };
    }
  }
} 