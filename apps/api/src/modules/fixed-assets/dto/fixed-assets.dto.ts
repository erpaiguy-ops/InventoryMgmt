import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssetCategoryDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsIn(['straight_line', 'declining_balance'])
  defaultMethod!: 'straight_line' | 'declining_balance';

  @IsNumber()
  @Min(1)
  defaultLifeMonths!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultSalvagePct?: number;
}

export class CreateAssetDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsNumber()
  @Min(0.01)
  acquisitionCost!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @IsNumber()
  @Min(1)
  usefulLifeMonths!: number;

  @IsIn(['straight_line', 'declining_balance'])
  method!: 'straight_line' | 'declining_balance';

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsUUID()
  purchaseBillId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsUUID()
  fundingAccountId!: string;
}

export class RunDepreciationDto {
  @IsDateString()
  runDate!: string;
}

export class DisposeAssetDto {
  @IsDateString()
  disposalDate!: string;

  @IsNumber()
  @Min(0)
  proceeds!: number;

  @IsUUID()
  depositAccountId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
