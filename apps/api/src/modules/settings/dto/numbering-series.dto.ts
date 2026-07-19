import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateNumberingSeriesDto {
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9_]+$/, { message: 'docType must be snake_case' })
  docType!: string;

  @IsString()
  @MaxLength(12)
  prefix!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  padding?: number;
}

export class UpdateNumberingSeriesDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  prefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nextNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  padding?: number;
}
