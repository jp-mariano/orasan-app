import { NextRequest, NextResponse } from 'next/server';

import { generateInvoicePdf, InvoicePdfData } from '@/lib/invoice-pdf';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    // Fetch invoice with project and items (same shape as GET /api/invoices/[id])
    const { data: invoiceRow, error: invoiceError } = await supabase
      .from('invoices')
      .select(
        `
        *,
        project:project_id (
          id,
          name,
          client_name,
          client_email,
          client_address,
          client_phone
        ),
        items:invoice_items (
          name,
          description,
          quantity,
          unit_cost,
          total_cost
        )
      `
      )
      .eq('id', invoiceId)
      .eq('user_id', authUser.id)
      .single();

    if (invoiceError || !invoiceRow) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Fetch business info (user profile)
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select(
        'business_name, business_email, business_address, business_phone, tax_id'
      )
      .eq('id', authUser.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 500 }
      );
    }

    const project = invoiceRow.project as {
      name: string;
      client_name?: string;
      client_email?: string;
      client_address?: string;
      client_phone?: string;
    } | null;
    const items = (invoiceRow.items ?? []) as Array<{
      name: string;
      description?: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
    }>;

    const pdfData: InvoicePdfData = {
      invoice: {
        invoice_number: invoiceRow.invoice_number,
        status: invoiceRow.status,
        issue_date: invoiceRow.issue_date,
        due_date: invoiceRow.due_date ?? null,
        subtotal: Number(invoiceRow.subtotal),
        tax_rate: Number(invoiceRow.tax_rate ?? 0),
        tax_amount: Number(invoiceRow.tax_amount ?? 0),
        total_amount: Number(invoiceRow.total_amount),
        currency_code: invoiceRow.currency_code ?? 'USD',
        payment_terms: invoiceRow.payment_terms ?? null,
        notes: invoiceRow.notes ?? null,
      },
      items,
      business: {
        business_name: userRow.business_name ?? null,
        business_email: userRow.business_email ?? null,
        business_address: userRow.business_address ?? null,
        business_phone: userRow.business_phone ?? null,
        tax_id: userRow.tax_id ?? null,
      },
      client: {
        name: project?.name ?? '—',
        client_name: project?.client_name ?? null,
        client_email: project?.client_email ?? null,
        client_address: project?.client_address ?? null,
        client_phone: project?.client_phone ?? null,
      },
    };

    const buffer = await generateInvoicePdf(pdfData);
    const filename =
      `invoice-${invoiceRow.invoice_number ?? invoiceId}.pdf`.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
