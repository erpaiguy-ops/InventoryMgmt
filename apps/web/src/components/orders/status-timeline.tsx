import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StatusTimelineProps {
  steps: string[];
  currentStatus: string;
  cancelledLabel?: string;
}

export function StatusTimeline({
  steps,
  currentStatus,
  cancelledLabel = 'cancelled',
}: StatusTimelineProps) {
  if (currentStatus === cancelledLabel) {
    return (
      <div className="text-destructive flex items-center gap-2 text-sm font-medium">
        <X className="h-4 w-4" />
        Cancelled
      </div>
    );
  }

  const currentIndex = steps.indexOf(currentStatus);

  return (
    <ol className="flex items-center">
      {steps.map((step, index) => {
        const isComplete = index <= currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                  isComplete
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'text-muted-foreground border-muted-foreground/40',
                )}
              >
                {isComplete ? <Check className="h-3 w-3" /> : index + 1}
              </div>
              <span className="text-muted-foreground text-xs capitalize">{step}</span>
            </div>
            {!isLast ? (
              <div className={cn('mx-2 h-px flex-1', isComplete ? 'bg-primary' : 'bg-muted')} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
