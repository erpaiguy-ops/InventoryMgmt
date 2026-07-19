import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TransferLineDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;
}

export class CreateTransferDto {
  @IsUUID()
  fromWarehouseId!: string;

  @IsUUID()
  toWarehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines!: TransferLineDto[];
}

export class AdjustmentLineDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsNumber()
  qtyChange!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreateAdjustmentDto {
  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsBoolean()
  isOpening?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines!: AdjustmentLineDto[];
}

export class SubmitForApprovalDto {
  @IsOptional()
  @IsUUID()
  reasonCodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reasonText?: string;
}

export class CreateAuditDto {
  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AuditCountDto {
  @IsUUID()
  lineId!: string;

  @IsNumber()
  @Min(0)
  countedQty!: number;
}

export class EnterAuditCountsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuditCountDto)
  counts!: AuditCountDto[];
}

export class ReorderRuleDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsNumber()
  @Min(0)
  minQty!: number;

  @IsNumber()
  @Min(0)
  reorderQty!: number;

  @IsOptional()
  @IsUUID()
  preferredSupplierId?: string;
}
