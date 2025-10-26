// src/common/base.controller.ts
import {
  Get, Post, Put, Delete, Body, Param, Query, Req, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BaseService, BaseControllerOptions } from './base.service';
import { IApiResponse } from '../types/response';

type AnyDto = Record<string, any>;

export abstract class BaseController<TEntity extends AnyDto, TList extends AnyDto = TEntity> {
  protected constructor(
    protected readonly baseService: BaseService<TEntity, TList>,
    protected readonly route: string,
    protected readonly options: BaseControllerOptions = {},
  ) {}

  @ApiBearerAuth()
  @Get()
  findAll(@Query() query: any, @Req() request: any): Promise<{ data: TList[]; count: number }> {
    return this.baseService.findAll(query, request.user, { requirePerms: this.options.permissions?.list });
  }

  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: any): Promise<TEntity | null> {
    return this.baseService.findOne(id, request.user, { requirePerms: this.options.permissions?.read });
  }

  @ApiBearerAuth()
  @Post()
  create(@Body() createDto: TEntity, @Req() request: any): Promise<IApiResponse<TEntity>> {
    return this.baseService.create(createDto, request.user, { requirePerms: this.options.permissions?.create });
  }

  @ApiBearerAuth()
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<TEntity>,
    @Req() request: any,
  ): Promise<IApiResponse<TEntity>> {
    return this.baseService.update(id, updateDto, request.user, { requirePerms: this.options.permissions?.update });
  }

  @ApiBearerAuth()
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() request: any): Promise<IApiResponse<boolean>> {
    return this.baseService.delete(id, request.user, { requirePerms: this.options.permissions?.delete });
  }
}
