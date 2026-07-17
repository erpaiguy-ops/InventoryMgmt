import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'orgSlug must be lowercase letters, numbers, and hyphens only',
  })
  orgSlug!: string;

  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
