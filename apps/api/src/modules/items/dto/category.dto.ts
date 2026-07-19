import type { CategoryAttribute } from '@inventory-mgmt/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CategoryAttributeDto implements CategoryAttribute {
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9_]+$/, { message: 'attribute key must be snake_case' })
  key!: string;

  @IsString()
  @MaxLength(80)
  label!: string;

  @IsIn(['text', 'number', 'boolean', 'date'])
  type!: 'text' | 'number' | 'boolean' | 'date';
}

export class CreateCategoryDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryAttributeDto)
  attributeSchema?: CategoryAttributeDto[];
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryAttributeDto)
  attributeSchema?: CategoryAttributeDto[];
}

export class CreateBrandDto {
  @IsString()
  @MaxLength(120)
  name!: string;
}
