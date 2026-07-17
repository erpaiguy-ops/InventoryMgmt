import { IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @IsUUID()
  roleId!: string;
}
