import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Company } from '../models/company.model';

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
      await company.update({ isActive: false });
      return true;
    }
    return false;
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.findAll({
      where: { isActive: true },
    });
  }
}
