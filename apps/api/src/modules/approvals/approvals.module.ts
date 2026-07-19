import { Global, Module } from '@nestjs/common';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

/**
 * Global: any gated document module (inventory now; procurement, sales, HRM
 * later) injects ApprovalsService to submit requests and register its
 * post/reject callbacks without importing the module explicitly.
 */
@Global()
@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
