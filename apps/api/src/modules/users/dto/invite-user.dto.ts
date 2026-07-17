import { ProfileRole } from '@inventory-mgmt/shared-types';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(ProfileRole)
  role?: ProfileRole;
}
