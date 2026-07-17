import { Type } from 'class-transformer';
import { ArrayMinSize, IsUUID, ValidateNested } from 'class-validator';

import { UpdateStockDto } from './update-stock.dto';

class BulkStockItemDto extends UpdateStockDto {
  @IsUUID()
  productId!: string;
}

export class BulkUpdateStockDto {
  @ValidateNested({ each: true })
  @Type(() => BulkStockItemDto)
  @ArrayMinSize(1)
  items!: BulkStockItemDto[];
}
