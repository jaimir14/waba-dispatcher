import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Company } from '../models/company.model';
import { Op } from 'sequelize';

@Injectable()
export class CompanyRepository {
  constructor(
    @InjectModel(Company)
    private readonly companyModel: typeof Company,
  ) {}

  async findByApiKey(apiKey: string): Promise<Company | null> {
    return this.companyModel.findOne({
      where: { apiKey, isActive: true },
    });
  }

  async findByName(name: string): Promise<Company | null> {
    return this.companyModel.findOne({
      where: { name, isActive: true },
    });
  }

  async findById(id: string): Promise<Company | null> {
    return this.companyModel.findByPk(id);
  }

  async create(companyData: Partial<Company>): Promise<Company> {
    return this.companyModel.create(companyData);
  }

  async update(
    id: string,
    companyData: Partial<Company>,
  ): Promise<Company | null> {
    const company = await this.findById(id);
    if (company) {
      await company.update(companyData);
      return company;
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    const company = await this.findById(id);
    if (company) {
      await company.destroy(); // This will soft delete (set deletedAt)
      return true;
    }
    return false;
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.findAll({
      where: { isActive: true },
    });
  }

  /**
   * Find companies with advanced filtering and sorting
   */
  async findWithFilters(options: {
    search?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ companies: Company[]; total: number }> {
    const where: any = {};

    // Add search filter
    if (options.search) {
      where.name = {
        [Op.like]: `%${options.search}%`,
      };
    }

    // Add active filter
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    // Build order clause
    const order: any[] = [];
    if (options.sortBy && options.sortOrder) {
      order.push([options.sortBy, options.sortOrder]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const { count, rows } = await this.companyModel.findAndCountAll({
      where,
      order,
      attributes: ['id', 'name', 'apiKey', 'isActive', 'settings', 'createdAt', 'updatedAt'],
    });

    return {
      companies: rows,
      total: count,
    };
  }

  /**
   * Check if company name already exists
   */
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const where: any = { name };
    
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const count = await this.companyModel.count({ where });
    return count > 0;
  }

  /**
   * Activate a company
   */
  async activate(id: string): Promise<Company | null> {
    return this.update(id, { isActive: true });
  }

  /**
   * Deactivate a company
   */
  async deactivate(id: string): Promise<Company | null> {
    return this.update(id, { isActive: false });
  }

  /**
   * Restore a soft deleted company
   */
  async restore(id: string): Promise<Company | null> {
    const company = await this.companyModel.findByPk(id, {
      paranoid: false, // Include soft deleted records
    });
    
    if (company && company.deletedAt) {
      await company.restore();
      return company;
    }
    return null;
  }

  /**
   * Permanently delete a company (hard delete)
   */
  async permanentDelete(id: string): Promise<boolean> {
    const company = await this.companyModel.findByPk(id, {
      paranoid: false, // Include soft deleted records
    });
    
    if (company) {
      await company.destroy({ force: true }); // Force permanent deletion
      return true;
    }
    return false;
  }

  /**
   * Get all companies including soft deleted ones
   */
  async findAllWithDeleted(): Promise<Company[]> {
    return this.companyModel.findAll({
      paranoid: false, // Include soft deleted records
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get only soft deleted companies
   */
  async findDeleted(): Promise<Company[]> {
    return this.companyModel.findAll({
      where: {
        deletedAt: {
          [Op.ne]: null,
        },
      },
      paranoid: false, // Include soft deleted records
      order: [['deletedAt', 'DESC']],
    });
  }

  /**
   * Find companies with advanced filters (including soft deleted option)
   */
  async findWithFiltersAdvanced(options: {
    search?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'deletedAt';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ companies: Company[]; total: number }> {
    const where: any = {};

    // Add search filter
    if (options.search) {
      where.name = {
        [Op.like]: `%${options.search}%`,
      };
    }

    // Add active filter
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    // Build order clause
    const order: any[] = [];
    if (options.sortBy && options.sortOrder) {
      order.push([options.sortBy, options.sortOrder]);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const queryOptions: any = {
      where,
      order,
      attributes: ['id', 'name', 'apiKey', 'isActive', 'settings', 'createdAt', 'updatedAt', 'deletedAt'],
    };

    // Include soft deleted records if requested
    if (options.includeDeleted) {
      queryOptions.paranoid = false;
    }

    const { count, rows } = await this.companyModel.findAndCountAll(queryOptions);

    return {
      companies: rows,
      total: count,
    };
  }
}
