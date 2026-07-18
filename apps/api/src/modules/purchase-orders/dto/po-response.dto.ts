import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseOrderItemResponseDto {
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

export class PurchaseOrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  poNumber!: string;

  @ApiPropertyOptional({ nullable: true })
  supplierId!: string | null;

  @ApiProperty()
  orderDate!: string;

  @ApiPropertyOptional({ nullable: true })
  expectedDelivery!: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  totalAmount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ type: [PurchaseOrderItemResponseDto] })
  items?: PurchaseOrderItemResponseDto[];
}
