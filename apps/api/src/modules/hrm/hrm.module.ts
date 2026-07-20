import { Module } from '@nestjs/common';

import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';

@Module({
  controllers: [HrmController],
  providers: [HrmService],
  exports: [HrmService],
})
export class HrmModule {}
