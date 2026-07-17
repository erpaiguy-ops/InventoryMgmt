import { SalesOrderStatus } from '@inventory-mgmt/shared-types';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListSalesOrdersDto {
  @IsOptional()
  @IsEnum(SalesOrderStatus)
  status?: SalesOrderStatus;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
