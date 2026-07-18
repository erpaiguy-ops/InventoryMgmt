import { StockMovementReferenceType, StockMovementType } from '@inventory-mgmt/shared-types';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, NotEquals } from 'class-validator';

export class UpdateStockDto {
  /** Positive to increase stock, negative to decrease it. */
  @IsInt()
  @NotEquals(0)
  quantityChange!: number;

  @IsEnum(StockMovementType)
  movementType!: StockMovementType;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsEnum(StockMovementReferenceType)
  referenceType?: StockMovementReferenceType;

  @IsOptional()
  @IsString()
  notes?: string;
}
