import { IsNumber, IsOptional, IsInt, IsString, Min } from 'class-validator';

export class CreateProductDto {
  /** Omit to auto-generate a SKU. */
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}
