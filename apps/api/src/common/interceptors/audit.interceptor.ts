import type { Principal } from '@inventory-mgmt/shared-types';
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { SupabaseService } from '../supabase/supabase.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Writes one audit_log row per successful mutating request by a tenant
 * principal — the "who did what, when, from which endpoint" layer on top of
 * the already-immutable stock ledger and journal. Fire-and-forget: an audit
 * write failure is logged but never fails the user's request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { principal?: Principal }>();

    return next.handle().pipe(
      tap(() => {
        const principal = request.principal;
        if (!principal || principal.type !== 'tenant') return;
        if (!MUTATING_METHODS.has(request.method)) return;
        // Auth endpoints carry credentials — keep them out of the trail.
        if (request.originalUrl.includes('/auth/')) return;

        const module = request.originalUrl.split('/').filter(Boolean)[1] ?? null;
        void this.supabaseService
          .insertTenant(principal.tenantId, 'audit_log', {
            actor_id: principal.id,
            actor_name: principal.fullName ?? principal.username,
            method: request.method,
            path: request.originalUrl.split('?')[0],
            module,
            summary: `${request.method} ${request.originalUrl.split('?')[0]}`,
          })
          .then(({ error }) => {
            if (error) this.logger.warn(`Audit write failed: ${error.message}`);
          });
      }),
    );
  }
}
