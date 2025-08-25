import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ListsService } from './lists.service';
import { CreateListDto, UpdateListStatusDto, ListQueryDto, ListResponseDto } from '../dto/list.dto';
import { ListStatus } from '../database/models/list.model';

@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createList(@Body() createListDto: CreateListDto): Promise<ListResponseDto> {
    return this.listsService.createList(createListDto);
  }

  @Get()
  async getLists(@Query() query: ListQueryDto): Promise<ListResponseDto[]> {
    return this.listsService.getLists(query);
  }

  @Get(':id')
  async getListById(@Param('id') id: string): Promise<ListResponseDto | null> {
    return this.listsService.getListById(id);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateListStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateListStatusDto,
  ): Promise<void> {
    await this.listsService.updateListStatus(id, updateStatusDto.status);
  }

  @Put(':id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptList(@Param('id') id: string): Promise<void> {
    await this.listsService.updateListStatus(id, ListStatus.ACCEPTED);
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectList(@Param('id') id: string): Promise<void> {
    await this.listsService.updateListStatus(id, ListStatus.REJECTED);
  }

  @Put(':id/expire')
  @HttpCode(HttpStatus.OK)
  async expireList(@Param('id') id: string): Promise<void> {
    await this.listsService.updateListStatus(id, ListStatus.EXPIRED);
  }
} 