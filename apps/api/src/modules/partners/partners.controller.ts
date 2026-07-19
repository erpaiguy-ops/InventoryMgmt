import { ACTIONS, MODULES } from '@inventory-mgmt/shared-types';
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

import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import {
  BulkCreatePartnersDto,
  CreatePartnerDto,
  CreatePartnerGroupDto,
  CreatePaymentTermDto,
  ListPartnersDto,
  UpdatePartnerDto,
} from './dto/partner.dto';
import { PartnersService } from './partners.service';

@ApiTags('partners')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  // Static routes before ':id'.

  // --- payment terms ---------------------------------------------------------

  @Get('payment-terms')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.VIEW)
  listPaymentTerms(@CurrentTenant() tenantId: string) {
    return this.partnersService.listPaymentTerms(tenantId);
  }

  @Post('payment-terms')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.MANAGE)
  createPaymentTerm(@CurrentTenant() tenantId: string, @Body() dto: CreatePaymentTermDto) {
    return this.partnersService.createPaymentTerm(tenantId, dto);
  }

  @Delete('payment-terms/:id')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePaymentTerm(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.partnersService.deletePaymentTerm(tenantId, id);
  }

  // --- groups ----------------------------------------------------------------

  @Get('groups')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.VIEW)
  listGroups(@CurrentTenant() tenantId: string) {
    return this.partnersService.listGroups(tenantId);
  }

  @Post('groups')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.CREATE)
  createGroup(@CurrentTenant() tenantId: string, @Body() dto: CreatePartnerGroupDto) {
    return this.partnersService.createGroup(tenantId, dto);
  }

  @Delete('groups/:id')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGroup(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.partnersService.deleteGroup(tenantId, id);
  }

  // --- partners --------------------------------------------------------------

  @Get()
  @RequirePermission(MODULES.PARTNERS, ACTIONS.VIEW)
  findAll(@CurrentTenant() tenantId: string, @Query() query: ListPartnersDto) {
    return this.partnersService.findAll(tenantId, query);
  }

  @Post()
  @RequirePermission(MODULES.PARTNERS, ACTIONS.CREATE)
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePartnerDto) {
    return this.partnersService.create(tenantId, dto);
  }

  @Post('bulk')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.CREATE)
  bulkCreate(@CurrentTenant() tenantId: string, @Body() dto: BulkCreatePartnersDto) {
    return this.partnersService.bulkCreate(tenantId, dto);
  }

  @Get(':id')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.VIEW)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.partnersService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.UPDATE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return this.partnersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(MODULES.PARTNERS, ACTIONS.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.partnersService.remove(tenantId, id);
  }
}
