import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { ExportReportDto } from './dto/export-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory')
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  @Get('sales')
  getSalesReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getSalesReport(query);
  }

  @Get('purchase')
  getPurchaseReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getPurchaseReport(query);
  }

  @Get('profit')
  @Roles('super_admin', 'admin', 'manager')
  getProfitReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getProfitReport(query);
  }

  @Get('top-products')
  getTopProducts(@Query('limit') limit: string | undefined, @Query() query: ReportQueryDto) {
    return this.reportsService.getTopProducts(limit ? Number(limit) : undefined, query);
  }

  @Get('categories')
  getCategoryReport(@Query() query: ReportQueryDto) {
    return this.reportsService.getCategoryReport(query);
  }

  @Get('suppliers')
  getSupplierReport() {
    return this.reportsService.getSupplierReport();
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Post('export')
  @Roles('super_admin', 'admin', 'manager')
  exportReport(@Body() dto: ExportReportDto) {
    return this.reportsService.exportReport(dto);
  }
}
