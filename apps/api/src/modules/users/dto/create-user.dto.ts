import { IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Matches(/^[a-z0-9._-]+$/, {
    message: 'username must be lowercase letters, numbers, dots, underscores, and hyphens only',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsUUID()
  roleId!: string;
}
