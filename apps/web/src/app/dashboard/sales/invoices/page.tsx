'use client';

import { type OrgSettings, type SalesInvoice } from '@inventory-mgmt/shared-types';
import { ArrowLeft, FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import Link from 'next/link';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSalesInvoices } from '@/hooks/use-sales';
import { useOrgSettings } from '@/hooks/use-settings';
import {
  exportCsv,
  exportWordDocument,
  printLetterheadDocument,
  tableHtml,
  type Letterhead,
} from '@/lib/exports';

const STATUS_VARIANT: Record<SalesInvoice['status'], 'default' | 'secondary' | 'outline'> = {
  open: 'outline',
  paid: 'default',
  cancelled: 'secondary',
};

function toLetterhead(settings: OrgSettings | undefined): Letterhead {
  return {
    orgName: settings?.orgName ?? 'Company',
    address: settings?.address,
    phone: settings?.phone,
    taxNumber: settings?.taxNumber,
    footer: settings?.documentFooter,
  };
}

function invoiceBodyHtml(invoice: SalesInvoice): string {
  const meta = `
    <table style="margin-bottom:16px">
      <tbody>
        <tr><td><b>Invoice no</b></td><td>${invoice.docNo}</td><td><b>Date</b></td><td>${invoice.invoiceDate}</td></tr>
        <tr><td><b>Customer</b></td><td>${invoice.customerName ?? ''}</td><td><b>Due</b></td><td>${invoice.dueDate ?? '—'}</td></tr>
      </tbody>
    </table>`;
  const lines = tableHtml(
    ['#', 'Item', 'Qty', 'Unit price', 'Line total'],
    invoice.lines.map((line, i) => [
      i + 1,
      `${line.itemSku ?? ''} ${line.itemName ?? ''}`,
      line.qty,
      Number(line.unitPrice).toFixed(2),
      Number(line.lineTotal).toFixed(2),
    ]),
    [2, 3, 4],
  );
  const totals = `
    <table style="margin-top:16px;width:auto;margin-left:auto">
      <tbody>
        <tr><td><b>Subtotal</b></td><td style="text-align:right">${Number(invoice.subtotal).toFixed(2)}</td></tr>
        <tr><td><b>Tax</b></td><td style="text-align:right">${Number(invoice.taxTotal).toFixed(2)}</td></tr>
        <tr><td><b>Total</b></td><td style="text-align:right"><b>${Number(invoice.total).toFixed(2)}</b></td></tr>
      </tbody>
    </table>`;
  return meta + lines + totals;
}

export default function SalesInvoicesPage() {
  const { data: invoices, isLoading } = useSalesInvoices();
  const { data: orgSettings } = useOrgSettings();

  const columns: DataTableColumn<SalesInvoice>[] = [
    {
      key: 'doc',
      header: 'Doc no',
      render: (invoice) => <span className="font-mono text-xs">{invoice.docNo}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (invoice) => invoice.customerName ?? invoice.customerId,
    },
    { key: 'date', header: 'Invoice date', render: (invoice) => invoice.invoiceDate },
    { key: 'due', header: 'Due', render: (invoice) => invoice.dueDate ?? '—' },
    { key: 'total', header: 'Total', render: (invoice) => Number(invoice.total).toFixed(2) },
    {
      key: 'paid',
      header: 'Paid',
      render: (invoice) => Number(invoice.amountPaid).toFixed(2),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => <Badge variant={STATUS_VARIANT[invoice.status]}>{invoice.status}</Badge>,
    },
    {
      key: 'export',
      header: 'Export',
      render: (invoice) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Print / PDF with letterhead"
            onClick={(e) => {
              e.stopPropagation();
              printLetterheadDocument(
                toLetterhead(orgSettings),
                `Tax Invoice ${invoice.docNo}`,
                invoiceBodyHtml(invoice),
              );
            }}
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Download as Word"
            onClick={(e) => {
              e.stopPropagation();
              exportWordDocument(
                invoice.docNo,
                toLetterhead(orgSettings),
                `Tax Invoice ${invoice.docNo}`,
                invoiceBodyHtml(invoice),
              );
            }}
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href="/dashboard/sales">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Sales invoices</h1>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={(invoices ?? []).length === 0}
          onClick={() =>
            exportCsv(
              'sales-invoices',
              ['Doc no', 'Customer', 'Invoice date', 'Due date', 'Total', 'Paid', 'Status'],
              (invoices ?? []).map((inv) => [
                inv.docNo,
                inv.customerName ?? inv.customerId,
                inv.invoiceDate,
                inv.dueDate,
                inv.total,
                inv.amountPaid,
                inv.status,
              ]),
            )
          }
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Invoices are created from a sales order&apos;s detail page, matched against delivered
        quantities. Print/PDF and Word exports carry your letterhead from Settings.
      </p>
      <DataTable
        columns={columns}
        data={invoices ?? []}
        loading={isLoading}
        emptyMessage="No invoices created yet"
      />
    </div>
  );
}
