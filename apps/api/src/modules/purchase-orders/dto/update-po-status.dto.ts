import { IsIn } from 'class-validator';

export class UpdatePurchaseOrderStatusDto {
  @IsIn(['draft', 'pending', 'cancelled'])
  status!: 'draft' | 'pending' | 'cancelled';
}
