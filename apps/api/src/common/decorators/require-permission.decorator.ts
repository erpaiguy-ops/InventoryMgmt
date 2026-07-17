import type { ModuleName, PermissionAction } from '@inventory-mgmt/shared-types';
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface RequiredPermission {
  module: ModuleName;
  action: PermissionAction;
}

export const RequirePermission = (module: ModuleName, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { module, action } satisfies RequiredPermission);
