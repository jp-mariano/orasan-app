import PDFDocument from 'pdfkit';

import { formatPriceWithCurrency } from '@/lib/currencies';
import { formatDate } from '@/lib/utils';

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
    notes?: string | null;
  };
  items: Array<{
    name: string;
    quantity: number;
    rate_type?: string | null;
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
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN;

// Equal left and right indentation for the content block (lessen this value for a wider block)
const CONTENT_LEFT_INSET = 30;
const CONTENT_RIGHT_INSET = 0;
const CONTENT_BLOCK_WIDTH =
  CONTENT_WIDTH - CONTENT_LEFT_INSET - CONTENT_RIGHT_INSET;

// Spacing to align with preview
const SECTION_GAP = 28;
const TABLE_ROW_HEIGHT = 26;
const TOTALS_WIDTH = 200;

// Table column share of content block width (must sum to 1)
const TABLE_COL_RATIOS = [0.4, 0.12, 0.18, 0.15, 0.15] as const;

// Shared cell/typography helpers for PDF tables
type PdfAlignLeft = { x: 'left'; y: 'center' };
type PdfAlignRight = { x: 'right'; y: 'center' };
type PdfFont = { family?: string; size?: number };

type BaseCell = {
  text: string;
  align?: PdfAlignLeft | PdfAlignRight;
  textColor?: string;
  font?: PdfFont;
};

const BODY_FONT_FAMILY = 'Helvetica';
const BODY_FONT_SIZE = 10;
const INFO_HEADER_FONT: PdfFont = { family: 'Helvetica-Bold', size: 11 };
const TABLE_HEADER_FONT: PdfFont = { family: 'Helvetica-Bold', size: 10 };

function formatRateType(rt: string | null | undefined): string {
  if (!rt) return '—';
  const s = String(rt).toLowerCase();
  if (s === 'hourly') return 'Hourly';
  if (s === 'fixed') return 'Fixed';
  return rt;
}

/**
 * Generates an invoice PDF as a buffer using PDFKit.
 * Layout and spacing mirror the invoice detail page preview.
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

    const blockLeft = CONTENT_LEFT_INSET;
    const blockRight = CONTENT_WIDTH - CONTENT_RIGHT_INSET;

    // ---- Header: Invoice title + business (centered block) ----
    doc.fontSize(22).font('Helvetica-Bold').text('Invoice', blockLeft, doc.y);
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(11);
    doc.text(business.business_name || '—', blockLeft, doc.y, {
      width: CONTENT_BLOCK_WIDTH,
      continued: false,
    });
    doc.moveDown(0.25);
    if (business.business_email) {
      doc.fontSize(10).text(business.business_email, blockLeft, doc.y, {
        width: CONTENT_BLOCK_WIDTH,
        continued: false,
      });
      doc.moveDown(0.4);
    }
    doc.moveDown(SECTION_GAP / 12);

    // ---- Two columns: Bill To (left) and Details (right), as a table ----
    const infoTop = doc.y;

    const clientLines = [
      client.client_name || client.name || '—',
      client.client_email || '',
      client.client_address || '',
      client.client_phone || '',
    ].filter(Boolean);

    const detailLines = [
      `Invoice number: ${invoice.invoice_number ?? '—'}`,
      `Issue date: ${formatDate(invoice.issue_date, true)}`,
      `Due date: ${invoice.due_date ? formatDate(invoice.due_date, true) : '—'}`,
    ];

    const maxInfoRows = Math.max(clientLines.length, detailLines.length);
    const infoColWidth = CONTENT_BLOCK_WIDTH * 0.5;
    const infoColumnStyles = [infoColWidth, infoColWidth];

    // Header row: set doc font so table uses it (cell font option not honored by mixin)
    doc.font('Helvetica-Bold').fontSize(INFO_HEADER_FONT.size ?? 11);
    doc.table({
      position: { x: blockLeft, y: infoTop },
      maxWidth: CONTENT_BLOCK_WIDTH,
      columnStyles: infoColumnStyles,
      rowStyles: { border: false as const },
      data: [['Bill To', 'Details']],
    });

    // Body rows: regular font
    const infoBodyData: string[][] = [];
    for (let i = 0; i < maxInfoRows; i += 1) {
      infoBodyData.push([clientLines[i] ?? '', detailLines[i] ?? '']);
    }
    doc.font(BODY_FONT_FAMILY).fontSize(BODY_FONT_SIZE);
    doc.table({
      position: { x: blockLeft, y: doc.y },
      maxWidth: CONTENT_BLOCK_WIDTH,
      columnStyles: infoColumnStyles,
      rowStyles: { border: false as const },
      data: infoBodyData,
    });

    doc.moveDown(SECTION_GAP / 10);

    // ---- Items section (card with table + totals) ----
    const itemsTop = doc.y;
    doc.fontSize(11).font('Helvetica-Bold').text('Items', blockLeft, itemsTop);
    doc.font('Helvetica');
    doc.moveDown(1.2);

    const tableTop = doc.y;
    const tableWidth = CONTENT_BLOCK_WIDTH;
    const leftAlign: { align: PdfAlignLeft } = {
      align: { x: 'left', y: 'center' },
    };
    const rightAlign: { align: PdfAlignRight } = {
      align: { x: 'right', y: 'center' },
    };
    type TableCell = string | BaseCell;
    const itemsColumnStyles = TABLE_COL_RATIOS.map(ratio => tableWidth * ratio);

    // Header row: doc font sets bold (cell font not honored by mixin)
    const itemsHeaderRow: TableCell[] = [
      { text: 'Name', ...leftAlign },
      { text: 'Quantity', ...rightAlign },
      { text: 'Rate type', ...rightAlign },
      { text: 'Unit cost', ...rightAlign },
      { text: `Amount (${currencyCode})`, ...rightAlign },
    ];
    doc.font('Helvetica-Bold').fontSize(TABLE_HEADER_FONT.size ?? 10);
    doc.table({
      position: { x: blockLeft, y: tableTop },
      maxWidth: tableWidth,
      columnStyles: itemsColumnStyles,
      rowStyles: {
        border: [0, 0, 1, 0] as [number, number, number, number],
        borderColor: '#cbd5e1',
      },
      data: [itemsHeaderRow],
    });

    // Body rows: regular font
    const itemsBodyData: Array<Array<TableCell>> = items.map(item => [
      { text: item.name, ...leftAlign },
      { text: String(item.quantity), ...rightAlign },
      { text: formatRateType(item.rate_type ?? null), ...rightAlign },
      {
        text: formatPriceWithCurrency(item.unit_cost, currencyCode, false),
        ...rightAlign,
      },
      {
        text: formatPriceWithCurrency(item.total_cost, currencyCode, false),
        ...rightAlign,
      },
    ]);
    doc.font(BODY_FONT_FAMILY).fontSize(BODY_FONT_SIZE);
    doc.table({
      position: { x: blockLeft, y: doc.y },
      maxWidth: tableWidth,
      columnStyles: itemsColumnStyles,
      rowStyles: {
        border: [0, 0, 1, 0] as [number, number, number, number],
        borderColor: '#cbd5e1',
        height: TABLE_ROW_HEIGHT,
      },
      data: itemsBodyData,
    });

    doc.moveDown(1.5); // spacing before totals

    // Totals block (right-aligned within centered block, as tables)
    type TotalsCell = string | BaseCell;
    const totalsTableWidth = TOTALS_WIDTH;
    const totalsX = blockRight - totalsTableWidth;
    const totalsLeftAlign: { align: PdfAlignLeft } = {
      align: { x: 'left', y: 'center' },
    };
    const totalsRightAlign: { align: PdfAlignRight } = {
      align: { x: 'right', y: 'center' },
    };
    const totalsColumnStyles = [totalsTableWidth - 100, 100];

    // Subtotal + Tax rows: regular font
    const totalsSubTaxData: TotalsCell[][] = [
      [
        { text: 'Subtotal', ...totalsLeftAlign },
        {
          text: formatPriceWithCurrency(invoice.subtotal, currencyCode, false),
          ...totalsRightAlign,
        },
      ],
      [
        { text: `Tax (${invoice.tax_rate ?? 0}%)`, ...totalsLeftAlign },
        {
          text: formatPriceWithCurrency(
            invoice.tax_amount,
            currencyCode,
            false
          ),
          ...totalsRightAlign,
        },
      ],
    ];
    doc.font(BODY_FONT_FAMILY).fontSize(BODY_FONT_SIZE);
    doc.table({
      position: { x: totalsX, y: doc.y },
      maxWidth: totalsTableWidth,
      columnStyles: totalsColumnStyles,
      rowStyles: { border: false as const },
      data: totalsSubTaxData,
    });

    // Total row: bold (doc font so mixin honors it)
    const totalsTotalData: TotalsCell[][] = [
      [
        { text: 'Total', ...totalsLeftAlign },
        {
          text: formatPriceWithCurrency(invoice.total_amount, currencyCode),
          ...totalsRightAlign,
        },
      ],
    ];
    doc.font('Helvetica-Bold').fontSize(TABLE_HEADER_FONT.size ?? 10);
    doc.table({
      position: { x: totalsX, y: doc.y },
      maxWidth: totalsTableWidth,
      columnStyles: totalsColumnStyles,
      rowStyles: {
        border: [1, 0, 0, 0] as [number, number, number, number],
        borderColor: '#cbd5e1',
        height: TABLE_ROW_HEIGHT,
      },
      data: totalsTotalData,
    });

    doc.moveDown(SECTION_GAP / 10);

    // ---- Notes (separate card when present) ----
    if (invoice.notes && String(invoice.notes).trim()) {
      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica-Bold').text('Notes', blockLeft, doc.y);
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      doc.text(String(invoice.notes).trim(), blockLeft, doc.y, {
        width: CONTENT_BLOCK_WIDTH,
        align: 'left',
        lineGap: 4,
      });
      doc.fillColor('#000000');
    }

    doc.end();
  });
}
