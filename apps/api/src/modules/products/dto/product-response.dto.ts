import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InventorySummaryDto {
  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  warehouseLocation!: string | null;

  @ApiProperty()
  lastUpdated!: string;
}

export class ProductResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  category!: string | null;

  @ApiProperty()
  unitPrice!: number;

  @ApiPropertyOptional({ nullable: true })
  costPrice!: number | null;

  @ApiProperty()
  reorderLevel!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: InventorySummaryDto, nullable: true })
  inventory?: InventorySummaryDto | null;
}
