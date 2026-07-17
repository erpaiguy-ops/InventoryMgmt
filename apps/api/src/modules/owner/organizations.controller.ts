import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../common/guards/auth.guard';
import { OwnerGuard } from '../../common/guards/owner.guard';

import { BootstrapTenantAdminDto } from './dto/bootstrap-tenant-admin.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('owner')
@ApiBearerAuth()
@UseGuards(AuthGuard, OwnerGuard)
@Controller('owner/organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Put(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.organizationsService.setStatus(id, 'suspended');
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.organizationsService.setStatus(id, 'active');
  }

  @Post(':id/bootstrap-admin')
  bootstrapAdmin(@Param('id') id: string, @Body() dto: BootstrapTenantAdminDto) {
    return this.organizationsService.bootstrapAdmin(id, dto);
  }
}
