import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  productId!: string;

  /** Positive to increase stock, negative to decrease it. */
  @IsInt()
  @NotEquals(0)
  adjustment!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
