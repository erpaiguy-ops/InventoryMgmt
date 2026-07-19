import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUomDto {
  @IsString()
  @MaxLength(16)
  code!: string;

  @IsString()
  @MaxLength(80)
  name!: string;
}

export class UpdateUomDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
