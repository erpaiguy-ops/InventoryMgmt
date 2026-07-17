import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class ReceivedItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantityReceived!: number;
}

export class ReceivePurchaseOrderDto {
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  @ArrayMinSize(1)
  receivedItems!: ReceivedItemDto[];
}
