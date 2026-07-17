import { PartialType } from '@nestjs/swagger';

import { CreatePurchaseOrderDto } from './create-po.dto';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}
