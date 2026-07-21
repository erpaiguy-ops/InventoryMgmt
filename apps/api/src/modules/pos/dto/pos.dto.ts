import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class OpenCashDrawerSessionDto {
  @IsNumber()
  @Min(0)
  openingFloat!: number;
}

export class CloseCashDrawerSessionDto {
  @IsNumber()
  @Min(0)
  countedAmount!: number;
}

export class PosSaleLineDto {
  @IsUUID()
  itemId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsUUID()
  taxId?: string;
}

export class CreatePosSaleDto {
  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  paymentMethodId!: string;

  @IsUUID()
  depositAccountId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleLineDto)
  lines!: PosSaleLineDto[];
}
