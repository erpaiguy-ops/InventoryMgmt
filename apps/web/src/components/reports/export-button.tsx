'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/api-client';
import type { ExportReportType, ReportQueryParams } from '@/services/reports.service';
import { downloadCsv, reportsService } from '@/services/reports.service';

interface ExportButtonProps {
  type: ExportReportType;
  params?: ReportQueryParams;
}

export function ExportButton({ type, params }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { filename, csv } = await reportsService.exportReport(type, params);
      downloadCsv(filename, csv);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
