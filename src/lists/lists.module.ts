import { Module } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { DatabaseModule } from '../database';

@Module({
  imports: [DatabaseModule],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {} 