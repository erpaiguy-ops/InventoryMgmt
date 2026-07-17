import { ProfileRole } from '@inventory-mgmt/shared-types';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @IsEnum(ProfileRole)
  role!: ProfileRole;
}
