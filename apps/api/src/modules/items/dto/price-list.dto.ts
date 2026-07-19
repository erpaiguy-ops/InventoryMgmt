import type { PriceListType } from '@inventory-mgmt/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePriceListDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsIn(['sales', 'purchase'])
  listType!: PriceListType;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePriceListDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PriceListItemDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsUUID()
  uomId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  minQty?: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class SetPriceListItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemDto)
  prices!: PriceListItemDto[];
}
