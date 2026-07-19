import type { PartnerAddressType, PartnerStatus } from '@inventory-mgmt/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PartnerContactDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  designation?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class PartnerAddressDto {
  @IsIn(['billing', 'shipping'])
  addressType!: PartnerAddressType;

  @IsString()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreatePartnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isCustomer?: boolean;

  @IsOptional()
  @IsBoolean()
  isSupplier?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taxIdNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsUUID()
  priceListId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsIn(['active', 'on_hold', 'archived'])
  status?: PartnerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerContactDto)
  contacts?: PartnerContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerAddressDto)
  addresses?: PartnerAddressDto[];
}

export class UpdatePartnerDto extends CreatePartnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare name: string;
}

export class BulkCreatePartnersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePartnerDto)
  partners!: CreatePartnerDto[];
}

export class ListPartnersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['customer', 'supplier'])
  role?: 'customer' | 'supplier';

  @IsOptional()
  @IsIn(['active', 'on_hold', 'archived'])
  status?: PartnerStatus;

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

export class CreatePaymentTermDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(0)
  netDays!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  earlyPayDiscountPct?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  earlyPayWithinDays?: number;
}

export class CreatePartnerGroupDto {
  @IsString()
  @MaxLength(80)
  name!: string;
}
