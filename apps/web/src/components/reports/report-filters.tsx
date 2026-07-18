'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReportFiltersProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function ReportFilters({ from, to, onFromChange, onToChange }: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label htmlFor="report-from">From</Label>
        <Input
          id="report-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="report-to">To</Label>
        <Input id="report-to" type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
      </div>
    </div>
  );
}
