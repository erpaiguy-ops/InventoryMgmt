import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OwnerAuthController } from './owner-auth.controller';
import { OwnerAuthService } from './owner-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController, OwnerAuthController],
  providers: [OrganizationsService, OwnerAuthService],
})
export class OwnerModule {}
