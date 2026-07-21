/**
 * In-app document exports (roadmap M10):
 *  - CSV: data-first Excel export — opens straight into a spreadsheet.
 *  - Print/PDF: a letterhead window the browser turns into a PDF.
 *  - Word: the same letterhead HTML served as a .doc — Word opens HTML
 *    natively, so the letterhead survives with zero dependencies.
 */

export interface Letterhead {
  orgName: string;
  address?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  footer?: string | null;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const escape = (value: string | number | null | undefined) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  download(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function letterheadDocumentHtml(
  letterhead: Letterhead,
  title: string,
  bodyHtml: string,
): string {
  const meta = [
    letterhead.address,
    letterhead.phone,
    letterhead.taxNumber ? `Tax no: ${letterhead.taxNumber}` : null,
  ]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(String(line))}</div>`)
    .join('');
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 800px; margin: 0 auto; padding: 32px;">
      <div style="border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px;">
        <div style="font-size: 26px; font-weight: bold; letter-spacing: 0.5px;">${escapeHtml(letterhead.orgName)}</div>
        <div style="font-size: 12px; color: #555; margin-top: 4px; line-height: 1.5;">${meta}</div>
      </div>
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">${escapeHtml(title)}</div>
      ${bodyHtml}
      ${
        letterhead.footer
          ? `<div style="border-top: 1px solid #ccc; margin-top: 32px; padding-top: 12px; font-size: 11px; color: #666;">${escapeHtml(letterhead.footer)}</div>`
          : ''
      }
    </div>`;
}

/** Opens a print window with the letterhead document — the browser's print dialog produces the PDF. */
export function printLetterheadDocument(
  letterhead: Letterhead,
  title: string,
  bodyHtml: string,
): void {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(
    `<html><head><title>${escapeHtml(title)}</title><style>
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
      th { background: #f0f0f0; }
      td.num, th.num { text-align: right; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>${letterheadDocumentHtml(letterhead, title, bodyHtml)}</body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

/** Downloads the letterhead document as a .doc — Word opens HTML natively, letterhead intact. */
export function exportWordDocument(
  filename: string,
  letterhead: Letterhead,
  title: string,
  bodyHtml: string,
): void {
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; }
  </style></head><body>${letterheadDocumentHtml(letterhead, title, bodyHtml)}</body></html>`;
  download(new Blob([html], { type: 'application/msword' }), `${filename}.doc`);
}

/** Renders headers + rows into the table HTML the letterhead exports embed. */
export function tableHtml(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  numericColumns: number[] = [],
): string {
  const th = headers
    .map((h, i) => `<th${numericColumns.includes(i) ? ' class="num"' : ''}>${h}</th>`)
    .join('');
  const trs = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, i) =>
              `<td${numericColumns.includes(i) ? ' class="num" style="text-align:right"' : ''}>${String(cell ?? '')}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}
