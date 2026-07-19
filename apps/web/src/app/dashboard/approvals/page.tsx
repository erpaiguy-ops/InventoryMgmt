'use client';

import type { ApprovalRequest } from '@inventory-mgmt/shared-types';
import { CheckCircle2, MessageSquare, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useActOnApproval, useApprovalHistory, useApprovalInbox } from '@/hooks/use-approvals';

const STATUS_VARIANT: Record<ApprovalRequest['status'], 'default' | 'outline' | 'destructive'> = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
};

function docTypeLabel(docType: string): string {
  return docType.replace(/_/g, ' ');
}

function RequestCard({
  request,
  actionable,
  onAct,
}: {
  request: ApprovalRequest;
  actionable: boolean;
  onAct?: (request: ApprovalRequest, decision: 'approve' | 'reject') => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base capitalize">
            {docTypeLabel(request.docType)}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              step {request.currentStep} of {request.totalSteps}
            </span>
          </CardTitle>
          <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Requested by {request.requestedByName ?? 'unknown'} ·{' '}
          {new Date(request.createdAt).toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3">
          <p className="text-muted-foreground text-xs font-medium uppercase">Reason</p>
          <p className="text-sm">
            {request.reasonCode && (
              <Badge variant="outline" className="mr-2">
                {request.reasonCode}
              </Badge>
            )}
            {request.reasonText ?? '—'}
          </p>
        </div>

        {request.actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Comment trail — visible to every later approver
            </p>
            {request.actions.map((action) => (
              <div key={action.id} className="flex items-start gap-2 text-sm">
                {action.decision === 'approve' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="text-destructive mt-0.5 h-4 w-4" />
                )}
                <div>
                  <span className="font-medium">{action.actorName ?? 'Someone'}</span>{' '}
                  <span className="text-muted-foreground">
                    {action.decision}d at step {action.stepNo} ·{' '}
                    {new Date(action.createdAt).toLocaleString()}
                  </span>
                  {action.comment && (
                    <p className="text-muted-foreground mt-0.5 flex items-start gap-1">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                      {action.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {actionable && onAct && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAct(request, 'approve')}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAct(request, 'reject')}>
              <XCircle className="mr-1 h-4 w-4" /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApprovalsPage() {
  const { data: inbox, isLoading: inboxLoading } = useApprovalInbox();
  const { data: history, isLoading: historyLoading } = useApprovalHistory();
  const actOnApproval = useActOnApproval();

  const [acting, setActing] = useState<{
    request: ApprovalRequest;
    decision: 'approve' | 'reject';
  } | null>(null);
  const [comment, setComment] = useState('');

  const confirmAct = () => {
    if (!acting) return;
    actOnApproval.mutate(
      { id: acting.request.id, decision: acting.decision, comment: comment.trim() || undefined },
      {
        onSuccess: (updated) => {
          toast.success(
            updated.status === 'approved'
              ? 'Approved — document posted'
              : updated.status === 'rejected'
                ? 'Rejected — nothing was posted'
                : 'Approved — moved to the next step',
          );
          setActing(null);
          setComment('');
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Approvals</h1>
      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">
            My inbox{inbox && inbox.length > 0 ? ` (${inbox.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="space-y-3">
          {inboxLoading ? (
            <LoadingSpinner />
          ) : (inbox ?? []).length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nothing waiting on you — all clear
            </p>
          ) : (
            (inbox ?? []).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                actionable
                onAct={(req, decision) => setActing({ request: req, decision })}
              />
            ))
          )}
        </TabsContent>
        <TabsContent value="history" className="space-y-3">
          {historyLoading ? (
            <LoadingSpinner />
          ) : (
            (history ?? []).map((request) => (
              <RequestCard key={request.id} request={request} actionable={false} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={acting !== null} onOpenChange={(o) => !o && setActing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acting?.decision === 'approve' ? 'Approve' : 'Reject'}{' '}
              {acting && docTypeLabel(acting.request.docType)}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {acting?.decision === 'approve'
              ? acting.request.currentStep >= acting.request.totalSteps
                ? 'This is the final step — approving will post the document and update stock.'
                : 'Your comment will be visible to the next approver.'
              : 'Rejecting closes the request; nothing posts. A comment explaining why is required.'}
          </p>
          <div className="space-y-1">
            <Label htmlFor="act-comment">
              Comment{acting?.decision === 'reject' ? ' (required)' : ''}
            </Label>
            <Textarea
              id="act-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Your note for the record and the next person"
            />
          </div>
          <DialogFooter>
            <Button
              variant={acting?.decision === 'reject' ? 'destructive' : 'default'}
              disabled={
                (acting?.decision === 'reject' && !comment.trim()) || actOnApproval.isPending
              }
              onClick={confirmAct}
            >
              Confirm {acting?.decision}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
