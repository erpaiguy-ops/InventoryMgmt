import type { ItemStatus, ItemTracking, ItemType } from '@inventory-mgmt/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemUomDto {
  @IsUUID()
  uomId!: string;

  @IsNumber()
  @Min(0.000001)
  factorToBase!: number;
}

export class ItemBarcodeDto {
  @IsString()
  @MaxLength(64)
  barcode!: string;

  @IsOptional()
  @IsUUID()
  uomId?: string;
}

export class CreateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['stocked', 'service'])
  itemType?: ItemType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  parentItemId?: string;

  @IsUUID()
  baseUomId!: string;

  @IsOptional()
  @IsUUID()
  purchaseUomId?: string;

  @IsOptional()
  @IsUUID()
  salesUomId?: string;

  @IsOptional()
  @IsUUID()
  taxId?: string;

  @IsOptional()
  @IsIn(['none', 'batch', 'serial'])
  tracking?: ItemTracking;

  @IsOptional()
  @IsBoolean()
  trackExpiry?: boolean;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  standardCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  standardPrice?: number;

  @IsOptional()
  @IsIn(['draft', 'active', 'discontinued'])
  status?: ItemStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemUomDto)
  uoms?: ItemUomDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemBarcodeDto)
  barcodes?: ItemBarcodeDto[];
}

export class UpdateItemDto extends CreateItemDto {
  // All CreateItemDto fields, but nothing is required on update.
  @IsOptional()
  @IsUUID()
  declare baseUomId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare name: string;
}

export class BulkCreateItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  items!: CreateItemDto[];
}

export class ListItemsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsIn(['draft', 'active', 'discontinued'])
  status?: ItemStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
