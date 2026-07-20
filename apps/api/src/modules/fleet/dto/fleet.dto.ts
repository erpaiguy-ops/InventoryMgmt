import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MaxLength(32)
  regNo!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsIn(['owned', 'rented'])
  ownership!: 'owned' | 'rented';

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  driverEmployeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  capacity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  driverEmployeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  capacity?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateVehicleDocumentDto {
  @IsUUID()
  vehicleId!: string;

  @IsIn(['registration', 'insurance', 'permit', 'inspection', 'other'])
  docType!: 'registration' | 'insurance' | 'permit' | 'inspection' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  docRef?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateVehicleExpenseDto {
  @IsUUID()
  vehicleId!: string;

  @IsIn(['fuel', 'maintenance', 'rental', 'toll', 'other'])
  expenseType!: 'fuel' | 'maintenance' | 'rental' | 'toll' | 'other';

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  odometer?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  creditAccountId!: string;
}
