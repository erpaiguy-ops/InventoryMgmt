import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateSalesOrderDto } from './dto/create-so.dto';
import { ListSalesOrdersDto } from './dto/list-sales-orders.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-so-status.dto';
import { UpdateSalesOrderDto } from './dto/update-so.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('sales-orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Post()
  @Roles('super_admin', 'admin', 'manager', 'staff')
  create(@Body() dto: CreateSalesOrderDto, @CurrentUser() user: User) {
    return this.salesOrdersService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() query: ListSalesOrdersDto) {
    return this.salesOrdersService.findAll(query);
  }

  @Get('report')
  generateReport(@Query() query: ListSalesOrdersDto) {
    return this.salesOrdersService.generateReport(query);
  }

  @Get('stats')
  getStats() {
    return this.salesOrdersService.getStats();
  }

  @Get('customer/:email')
  getCustomerOrders(@Param('email') email: string) {
    return this.salesOrdersService.getCustomerOrders(email);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Put(':id')
  @Roles('super_admin', 'admin', 'manager', 'staff')
  update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesOrdersService.update(id, dto);
  }

  @Put(':id/status')
  @Roles('super_admin', 'admin', 'manager', 'staff')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSalesOrderStatusDto) {
    return this.salesOrdersService.updateStatus(id, dto);
  }

  @Post(':id/confirm')
  @Roles('super_admin', 'admin', 'manager', 'staff')
  confirm(@Param('id') id: string) {
    return this.salesOrdersService.confirmOrder(id);
  }

  @Post(':id/ship')
  @Roles('super_admin', 'admin', 'manager', 'staff')
  ship(@Param('id') id: string) {
    return this.salesOrdersService.shipOrder(id);
  }

  @Post(':id/deliver')
  @Roles('super_admin', 'admin', 'manager', 'staff')
  deliver(@Param('id') id: string) {
    return this.salesOrdersService.deliverOrder(id);
  }

  @Post(':id/cancel')
  @Roles('super_admin', 'admin', 'manager', 'staff')
  cancel(@Param('id') id: string) {
    return this.salesOrdersService.cancelOrder(id);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDraft(@Param('id') id: string) {
    return this.salesOrdersService.deleteDraft(id);
  }
}
