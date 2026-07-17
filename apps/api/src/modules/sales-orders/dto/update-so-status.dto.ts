import { IsIn } from 'class-validator';

export class UpdateSalesOrderStatusDto {
  @IsIn(['draft', 'confirmed', 'shipped', 'delivered', 'cancelled'])
  status!: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
}
