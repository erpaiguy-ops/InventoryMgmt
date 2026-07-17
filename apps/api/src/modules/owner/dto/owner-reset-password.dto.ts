import { IsEmail } from 'class-validator';

export class OwnerResetPasswordDto {
  @IsEmail()
  email!: string;
}
