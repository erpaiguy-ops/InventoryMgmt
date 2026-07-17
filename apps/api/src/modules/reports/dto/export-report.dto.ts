import { IsIn, IsOptional } from 'class-validator';

export class ExportReportDto {
  @IsIn(['inventory', 'sales', 'purchase', 'profit', 'top-products', 'categories', 'suppliers'])
  type!:
    'inventory' | 'sales' | 'purchase' | 'profit' | 'top-products' | 'categories' | 'suppliers';

  /** Only 'csv' is currently supported; PDF/Excel would need extra rendering dependencies. */
  @IsIn(['csv'])
  format!: 'csv';

  @IsOptional()
  from?: string;

  @IsOptional()
  to?: string;
}
