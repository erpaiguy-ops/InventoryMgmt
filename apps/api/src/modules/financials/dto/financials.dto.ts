import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
  accountType!: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

  @IsIn(['debit', 'credit'])
  normalBalance!: 'debit' | 'credit';

  @IsOptional()
  @IsUUID()
  parentAccountId?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCostCenterDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsIn(['general', 'vehicle', 'department', 'project'])
  centerType?: 'general' | 'vehicle' | 'department' | 'project';
}

export class UpdateCostCenterDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class JournalLineDto {
  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  debit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateJournalEntryDto {
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsString()
  @MaxLength(500)
  memo!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class CreatePaymentMethodDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsIn(['cash', 'bank', 'card', 'cheque', 'other'])
  methodType!: 'cash' | 'bank' | 'card' | 'cheque' | 'other';

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;
}

export class CreateBankAccountDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  accountNumber?: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsNumber()
  openingBalance?: number;
}

export class CreateBankTransactionDto {
  @IsUUID()
  bankAccountId!: string;

  @IsOptional()
  @IsDateString()
  txnDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  amount!: number;
}

export class ArAllocationDto {
  @IsUUID()
  invoiceId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateArReceiptDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsUUID()
  paymentMethodId!: string;

  @IsUUID()
  depositAccountId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArAllocationDto)
  allocations!: ArAllocationDto[];
}

export class ApAllocationDto {
  @IsUUID()
  billId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateApPaymentDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsUUID()
  paymentMethodId!: string;

  @IsUUID()
  sourceAccountId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApAllocationDto)
  allocations!: ApAllocationDto[];
}

export class ClosePeriodDto {
  @IsDateString()
  periodStart!: string;
}

export class BalanceSheetQueryDto {
  @IsDateString()
  asOf!: string;
}

export class ProfitAndLossQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;
}
