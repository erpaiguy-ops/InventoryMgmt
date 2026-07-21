import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PoLineDto {
  @IsUUID()
  itemId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsUUID()
  taxId?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoLineDto)
  lines!: PoLineDto[];
}

export class GrnLineDto {
  @IsUUID()
  poLineId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateGoodsReceiptDto {
  @IsUUID()
  poId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrnLineDto)
  lines!: GrnLineDto[];
}

export class BillLineDto {
  @IsUUID()
  poLineId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreatePurchaseBillDto {
  @IsUUID()
  poId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  supplierBillNo?: string;

  @IsOptional()
  @IsDateString()
  billDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** ISO 4217 code. Defaults to the org's base currency when omitted. */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  /** Units of the org's base currency per 1 unit of `currency`. Defaults to 1. */
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  fxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillLineDto)
  lines!: BillLineDto[];
}

export class ReturnLineDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;
}

export class CreatePurchaseReturnDto {
  @IsUUID()
  supplierId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsUUID()
  reasonCodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reasonText?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnLineDto)
  lines!: ReturnLineDto[];
}

export class CreateLandedCostDto {
  @IsUUID()
  grId!: string;

  @IsString()
  @MaxLength(200)
  description!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}
