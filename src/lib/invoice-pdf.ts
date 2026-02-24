import PDFDocument from 'pdfkit';

import { getCurrencyByCode } from '@/lib/currencies';

/** Data shape for PDF generation (matches API/DB snake_case for invoice, user, project) */
export interface InvoicePdfData {
  invoice: {
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date?: string | null;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    currency_code: string;
    payment_terms?: string | null;
    notes?: string | null;
  };
  items: Array<{
    name: string;
    description?: string | null;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }>;
  business: {
    business_name?: string | null;
    business_email?: string | null;
    business_address?: string | null;
    business_phone?: string | null;
    tax_id?: string | null;
  };
  client: {
    name: string;
    client_name?: string | null;
    client_email?: string | null;
    client_address?: string | null;
    client_phone?: string | null;
  };
}

const MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  } catch {
    return '—';
  }
}

function formatMoney(amount: number, currencyCode: string): string {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol ?? currencyCode + ' ';
  const formatted = typeof amount === 'number' ? amount.toFixed(2) : '0.00';
  return `${symbol}${formatted}`;
}

/**
 * Generates an invoice PDF as a buffer using PDFKit.
 */
export async function generateInvoicePdf(
  data: InvoicePdfData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { invoice, items, business, client } = data;
    const currencyCode = invoice.currency_code ?? 'USD';

    // ---- Title ----
    doc.fontSize(22).text('INVOICE', { align: 'left' });
    doc.moveDown(1.5);

    // ---- Two columns: Business (left) and Client (right) ----
    const colWidth = (CONTENT_WIDTH - 30) / 2;
    const startY = doc.y;

    // Business information
    doc.fontSize(10).font('Helvetica-Bold').text('From', 0, startY);
    doc.font('Helvetica');
    let y = startY + 16;
    const businessLines = [
      business.business_name || '—',
      business.business_email || '',
      business.business_address || '',
      business.business_phone || '',
      business.tax_id ? `Tax ID: ${business.tax_id}` : '',
    ].filter(Boolean);
    businessLines.forEach(line => {
      doc.fontSize(10).text(line, 0, y, { width: colWidth, continued: false });
      y += 14;
    });

    // Client information (right column)
    const clientStartY = startY;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Bill To', colWidth + 30, clientStartY);
    doc.font('Helvetica');
    y = clientStartY + 16;
    const clientLines = [
      client.client_name || client.name || '—',
      client.client_email || '',
      client.client_address || '',
      client.client_phone || '',
    ].filter(Boolean);
    clientLines.forEach(line => {
      doc.fontSize(10).text(line, colWidth + 30, y, {
        width: colWidth,
        continued: false,
      });
      y += 14;
    });

    doc.y = Math.max(doc.y, y) + 20;

    // ---- Invoice header (number, dates, status) ----
    const headerY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text('Invoice Number', 0, headerY);
    doc.font('Helvetica').text(invoice.invoice_number ?? '—', 0, headerY + 14);
    doc.font('Helvetica-Bold').text('Issue Date', 120, headerY);
    doc
      .font('Helvetica')
      .text(formatDate(invoice.issue_date), 120, headerY + 14);
    doc.font('Helvetica-Bold').text('Due Date', 220, headerY);
    doc
      .font('Helvetica')
      .text(formatDate(invoice.due_date ?? null), 220, headerY + 14);
    doc.font('Helvetica-Bold').text('Status', 320, headerY);
    doc
      .font('Helvetica')
      .text(String(invoice.status ?? '—').toUpperCase(), 320, headerY + 14);
    doc.y = headerY + 32;
    doc.moveDown(2);

    // ---- Items table ----
    const tableTop = doc.y;
    const colWidths = {
      name: 140,
      description: 130,
      qty: 45,
      unit: 75,
      total: 80,
    };
    const rowHeight = 20;
    const tableHeaderY = tableTop;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Name', 0, tableHeaderY);
    doc.text('Description', colWidths.name, tableHeaderY);
    doc.text('Qty', colWidths.name + colWidths.description, tableHeaderY);
    doc.text(
      'Unit Cost',
      colWidths.name + colWidths.description + colWidths.qty,
      tableHeaderY
    );
    doc.text(
      'Total',
      colWidths.name + colWidths.description + colWidths.qty + colWidths.unit,
      tableHeaderY
    );
    doc.moveDown(0.5);
    doc.moveTo(0, doc.y).lineTo(CONTENT_WIDTH, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica');
    let rowY = doc.y;
    for (const item of items) {
      const desc =
        (item.description || '—').slice(0, 50) +
        ((item.description?.length ?? 0) > 50 ? '…' : '');
      doc.fontSize(9).text(item.name, 0, rowY, { width: colWidths.name - 4 });
      doc.text(desc, colWidths.name, rowY, {
        width: colWidths.description - 4,
      });
      doc.text(
        String(item.quantity),
        colWidths.name + colWidths.description,
        rowY
      );
      doc.text(
        formatMoney(item.unit_cost, currencyCode),
        colWidths.name + colWidths.description + colWidths.qty,
        rowY
      );
      doc.text(
        formatMoney(item.total_cost, currencyCode),
        colWidths.name + colWidths.description + colWidths.qty + colWidths.unit,
        rowY
      );
      rowY += rowHeight + 4;
    }

    doc.y = rowY + 12;

    // ---- Totals section ----
    const totalsLeft = CONTENT_WIDTH - 180;
    doc.font('Helvetica');
    doc.fontSize(10).text('Subtotal:', totalsLeft, doc.y);
    doc.text(
      formatMoney(invoice.subtotal, currencyCode),
      totalsLeft + 90,
      doc.y
    );
    doc.moveDown(0.8);
    doc.text('Tax:', totalsLeft, doc.y);
    doc.text(
      `${invoice.tax_rate ?? 0}% (${formatMoney(invoice.tax_amount, currencyCode)})`,
      totalsLeft + 90,
      doc.y
    );
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(11).text('Total:', totalsLeft, doc.y);
    doc.text(
      formatMoney(invoice.total_amount, currencyCode),
      totalsLeft + 90,
      doc.y
    );
    doc.font('Helvetica').fontSize(10);
    doc.moveDown(2);

    // ---- Payment terms and notes ----
    if (invoice.payment_terms) {
      doc.font('Helvetica-Bold').text('Payment Terms', 0, doc.y);
      doc.font('Helvetica').text(invoice.payment_terms, 0, doc.y + 14);
      doc.moveDown(1.2);
    }
    if (invoice.notes) {
      doc.font('Helvetica-Bold').text('Notes', 0, doc.y);
      doc.font('Helvetica').text(invoice.notes, 0, doc.y + 14, {
        width: CONTENT_WIDTH,
        align: 'left',
      });
    }

    doc.end();
  });
}
