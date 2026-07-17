import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StockMovementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  quantityChange!: number;

  @ApiProperty()
  previousQuantity!: number;

  @ApiProperty()
  newQuantity!: number;

  @ApiProperty()
  movementType!: string;

  @ApiPropertyOptional({ nullable: true })
  referenceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  referenceType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;
}
