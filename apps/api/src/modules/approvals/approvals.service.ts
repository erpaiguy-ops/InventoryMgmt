import type {
  ApprovalRequest,
  ApprovalAction,
  ReasonCode,
  TenantPrincipal,
} from '@inventory-mgmt/shared-types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

type QueryError = { message: string } | null;

interface RequestRow {
  id: string;
  doc_type: string;
  doc_id: string;
  workflow_id: string;
  current_step: number;
  status: 'pending' | 'approved' | 'rejected';
  reason_code_id: string | null;
  reason_text: string | null;
  requested_by: string | null;
  created_at: string;
  decided_at: string | null;
}
interface ActionRow {
  id: string;
  step_no: number;
  actor_id: string | null;
  decision: 'approve' | 'reject';
  comment: string | null;
  created_at: string;
}
interface StepRow {
  id: string;
  step_no: number;
  role_id: string;
}
interface ReasonRow {
  id: string;
  doc_type: string;
  code: string;
  label: string;
  is_active: boolean;
}

/**
 * Called by the approvals engine when a request receives its FINAL approval.
 * Each gated document type registers one — this is where "the material is
 * updated back to stock only after final approval" actually happens.
 */
export type ApprovalPoster = (tenantId: string, docId: string) => Promise<void>;
/** Called on rejection so the document can flip to its rejected status. */
export type ApprovalRejecter = (tenantId: string, docId: string) => Promise<void>;

@Injectable()
export class ApprovalsService {
  private readonly posters = new Map<string, ApprovalPoster>();
  private readonly rejecters = new Map<string, ApprovalRejecter>();

  constructor(private readonly supabaseService: SupabaseService) {}

  registerDocType(docType: string, poster: ApprovalPoster, rejecter: ApprovalRejecter): void {
    this.posters.set(docType, poster);
    this.rejecters.set(docType, rejecter);
  }

  /** Creates the pending request for a document. The document itself should already be in its pending_approval status. */
  async submit(
    tenantId: string,
    docType: string,
    docId: string,
    options: { reasonCodeId?: string; reasonText?: string; requestedBy?: string },
  ): Promise<void> {
    const { data: workflow } = (await this.supabaseService
      .selectTenant(tenantId, 'approval_workflows', 'id')
      .eq('doc_type', docType)
      .eq('is_active', true)
      .maybeSingle()) as { data: { id: string } | null };

    if (!workflow) {
      throw new BadRequestException(`No active approval workflow for ${docType}`);
    }

    const { error } = await this.supabaseService.insertTenant(tenantId, 'approval_requests', {
      doc_type: docType,
      doc_id: docId,
      workflow_id: workflow.id,
      reason_code_id: options.reasonCodeId,
      reason_text: options.reasonText,
      requested_by: options.requestedBy,
    });
    if (error) throw new ConflictException(error.message);
  }

  /** Pending requests the given principal can act on (their role matches the current step). */
  async inbox(principal: TenantPrincipal): Promise<ApprovalRequest[]> {
    const { data: requests, error } = (await this.supabaseService
      .selectTenant(principal.tenantId, 'approval_requests')
      .eq('status', 'pending')
      .order('created_at')) as unknown as { data: RequestRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const result: ApprovalRequest[] = [];
    for (const row of requests ?? []) {
      const steps = await this.workflowSteps(principal.tenantId, row.workflow_id);
      const current = steps.find((s) => s.step_no === row.current_step);
      if (!current || current.role_id !== principal.roleId) continue;
      result.push(await this.hydrate(principal.tenantId, row, steps.length));
    }
    return result;
  }

  /** All requests for the tenant (history view). */
  async list(tenantId: string): Promise<ApprovalRequest[]> {
    const { data: requests, error } = (await this.supabaseService
      .selectTenant(tenantId, 'approval_requests')
      .order('created_at', { ascending: false })
      .limit(100)) as unknown as { data: RequestRow[] | null; error: QueryError };
    if (error) throw new NotFoundException(error.message);

    const result: ApprovalRequest[] = [];
    for (const row of requests ?? []) {
      const steps = await this.workflowSteps(tenantId, row.workflow_id);
      result.push(await this.hydrate(tenantId, row, steps.length));
    }
    return result;
  }

  async getForDoc(
    tenantId: string,
    docType: string,
    docId: string,
  ): Promise<ApprovalRequest | null> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'approval_requests')
      .eq('doc_type', docType)
      .eq('doc_id', docId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: RequestRow | null };
    if (!data) return null;
    const steps = await this.workflowSteps(tenantId, data.workflow_id);
    return this.hydrate(tenantId, data, steps.length);
  }

  /**
   * The heart of the engine: an approver acts on the current step. Every
   * action requires the actor's role to match the step's role; every action
   * carries a comment that the next approver (and history) will see. The
   * final approve triggers the registered poster; a reject at any step
   * triggers the rejecter. Nothing posts before the final yes.
   */
  async act(
    principal: TenantPrincipal,
    requestId: string,
    decision: 'approve' | 'reject',
    comment: string | undefined,
  ): Promise<ApprovalRequest> {
    const tenantId = principal.tenantId;

    const { data: request } = (await this.supabaseService
      .selectTenant(tenantId, 'approval_requests')
      .eq('id', requestId)
      .maybeSingle()) as { data: RequestRow | null };
    if (!request) throw new NotFoundException(`Approval request ${requestId} not found`);
    if (request.status !== 'pending') {
      throw new ConflictException('This request has already been decided');
    }

    const steps = await this.workflowSteps(tenantId, request.workflow_id);
    const current = steps.find((s) => s.step_no === request.current_step);
    if (!current) throw new ConflictException('Workflow has no step for the current position');
    if (current.role_id !== principal.roleId) {
      throw new ForbiddenException('This step is not assigned to your role');
    }
    if (decision === 'reject' && !comment?.trim()) {
      throw new BadRequestException('A comment is required when rejecting');
    }

    const { error: actionError } = await this.supabaseService.insertTenant(
      tenantId,
      'approval_actions',
      {
        request_id: requestId,
        step_no: request.current_step,
        actor_id: principal.id,
        decision,
        comment: comment?.trim() || null,
      },
    );
    if (actionError) throw new ConflictException(actionError.message);

    const isLastStep = request.current_step >= steps.length;

    if (decision === 'reject') {
      await this.supabaseService.updateTenant(tenantId, 'approval_requests', requestId, {
        status: 'rejected',
        decided_at: new Date().toISOString(),
      });
      const rejecter = this.rejecters.get(request.doc_type);
      if (rejecter) await rejecter(tenantId, request.doc_id);
    } else if (isLastStep) {
      // Final approval: post the document FIRST, then mark the request, so a
      // posting failure leaves the request pending and retryable.
      const poster = this.posters.get(request.doc_type);
      if (!poster) {
        throw new ConflictException(`No poster registered for ${request.doc_type}`);
      }
      await poster(tenantId, request.doc_id);
      await this.supabaseService.updateTenant(tenantId, 'approval_requests', requestId, {
        status: 'approved',
        decided_at: new Date().toISOString(),
      });
    } else {
      await this.supabaseService.updateTenant(tenantId, 'approval_requests', requestId, {
        current_step: request.current_step + 1,
      });
    }

    const updated = await this.getForDoc(tenantId, request.doc_type, request.doc_id);
    if (!updated) throw new NotFoundException('Request disappeared while acting on it');
    return updated;
  }

  // --- reason codes ----------------------------------------------------------

  async listReasonCodes(tenantId: string, docType?: string): Promise<ReasonCode[]> {
    let builder = this.supabaseService.selectTenant(tenantId, 'reason_codes').eq('is_active', true);
    if (docType) builder = builder.eq('doc_type', docType);
    const { data, error } = (await builder.order('label')) as unknown as {
      data: ReasonRow[] | null;
      error: QueryError;
    };
    if (error) throw new NotFoundException(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      docType: r.doc_type,
      code: r.code,
      label: r.label,
      isActive: r.is_active,
    }));
  }

  async createReasonCode(
    tenantId: string,
    dto: { docType: string; code: string; label: string },
  ): Promise<ReasonCode> {
    const { data, error } = (await this.supabaseService
      .insertTenant(tenantId, 'reason_codes', {
        doc_type: dto.docType,
        code: dto.code,
        label: dto.label,
      })
      .select()
      .single()) as { data: ReasonRow | null; error: QueryError };
    if (error || !data) throw new ConflictException(error?.message ?? 'Failed to create reason');
    return {
      id: data.id,
      docType: data.doc_type,
      code: data.code,
      label: data.label,
      isActive: data.is_active,
    };
  }

  // --- internals -------------------------------------------------------------

  private async workflowSteps(tenantId: string, workflowId: string): Promise<StepRow[]> {
    const { data } = (await this.supabaseService
      .selectTenant(tenantId, 'approval_workflow_steps')
      .eq('workflow_id', workflowId)
      .order('step_no')) as unknown as { data: StepRow[] | null };
    return data ?? [];
  }

  private async hydrate(
    tenantId: string,
    row: RequestRow,
    totalSteps: number,
  ): Promise<ApprovalRequest> {
    const [{ data: actions }, { data: reason }, { data: requester }] = (await Promise.all([
      this.supabaseService
        .selectTenant(tenantId, 'approval_actions')
        .eq('request_id', row.id)
        .order('created_at'),
      row.reason_code_id
        ? this.supabaseService
            .selectTenant(tenantId, 'reason_codes', 'label')
            .eq('id', row.reason_code_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      row.requested_by
        ? this.supabaseService
            .selectTenant(tenantId, 'profiles', 'full_name, username')
            .eq('id', row.requested_by)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])) as unknown as [
      { data: ActionRow[] | null },
      { data: { label: string } | null },
      { data: { full_name: string | null; username: string } | null },
    ];

    const actorIds = [...new Set((actions ?? []).map((a) => a.actor_id).filter(Boolean))];
    const actorNames = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actors } = (await this.supabaseService
        .selectTenant(tenantId, 'profiles', 'id, full_name, username')
        .in('id', actorIds)) as unknown as {
        data: { id: string; full_name: string | null; username: string }[] | null;
      };
      for (const actor of actors ?? []) {
        actorNames.set(actor.id, actor.full_name ?? actor.username);
      }
    }

    const mappedActions: ApprovalAction[] = (actions ?? []).map((a) => ({
      id: a.id,
      stepNo: a.step_no,
      actorId: a.actor_id,
      actorName: a.actor_id ? (actorNames.get(a.actor_id) ?? null) : null,
      decision: a.decision,
      comment: a.comment,
      createdAt: a.created_at,
    }));

    return {
      id: row.id,
      docType: row.doc_type,
      docId: row.doc_id,
      currentStep: row.current_step,
      totalSteps,
      status: row.status,
      reasonCode: reason?.label ?? null,
      reasonText: row.reason_text,
      requestedBy: row.requested_by,
      requestedByName: requester ? (requester.full_name ?? requester.username) : null,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
      actions: mappedActions,
    };
  }
}
