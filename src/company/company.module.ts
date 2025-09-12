import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyRepository } from '../database/repositories/company.repository';
import { Company } from '../database/models/company.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Company]),
  ],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    CompanyRepository,
  ],
  exports: [
    CompanyService,
    CompanyRepository,
  ],
})
export class CompanyModule {} 