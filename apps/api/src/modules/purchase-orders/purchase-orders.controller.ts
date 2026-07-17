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

import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-po.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-po-status.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles('super_admin', 'admin', 'manager')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: User) {
    return this.purchaseOrdersService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() query: ListPurchaseOrdersDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get('report')
  generateReport(@Query() query: ListPurchaseOrdersDto) {
    return this.purchaseOrdersService.generateReport(query);
  }

  @Get('stats')
  getStats() {
    return this.purchaseOrdersService.getStats();
  }

  @Get('supplier/:supplierId')
  getSupplierOrders(@Param('supplierId') supplierId: string) {
    return this.purchaseOrdersService.getSupplierOrders(supplierId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Put(':id')
  @Roles('super_admin', 'admin', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, dto);
  }

  @Put(':id/status')
  @Roles('super_admin', 'admin', 'manager')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderStatusDto) {
    return this.purchaseOrdersService.updateStatus(id, dto);
  }

  @Post(':id/receive')
  @Roles('super_admin', 'admin', 'manager')
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.purchaseOrdersService.receive(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDraft(@Param('id') id: string) {
    return this.purchaseOrdersService.deleteDraft(id);
  }
}
