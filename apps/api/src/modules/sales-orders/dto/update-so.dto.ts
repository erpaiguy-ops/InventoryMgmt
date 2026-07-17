import { PartialType } from '@nestjs/swagger';

import { CreateSalesOrderDto } from './create-so.dto';

export class UpdateSalesOrderDto extends PartialType(CreateSalesOrderDto) {}
