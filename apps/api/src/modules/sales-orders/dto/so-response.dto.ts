import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SalesOrderItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  totalPrice!: number;
}

export class SalesOrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  customerName!: string;

  @ApiPropertyOptional({ nullable: true })
  customerEmail!: string | null;

  @ApiProperty()
  orderDate!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  totalAmount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ type: [SalesOrderItemResponseDto] })
  items?: SalesOrderItemResponseDto[];
}
