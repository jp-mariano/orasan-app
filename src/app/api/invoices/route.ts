import { NextRequest, NextResponse } from 'next/server';

import { generateInvoiceNumber } from '@/lib/invoice-utils';
import { createClient } from '@/lib/supabase/server';
import { CreateInvoiceRequest } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from the session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    // Build query
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by project_id if provided
    if (projectId) {
      // Verify the project exists and belongs to the user
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      query = query.eq('project_id', projectId);
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error) {
    console.error('Error in invoices GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from the session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceData: CreateInvoiceRequest = await request.json();

    // Validate required fields
    if (!invoiceData.project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    if (
      !invoiceData.date_range ||
      !invoiceData.date_range.from ||
      !invoiceData.date_range.to
    ) {
      return NextResponse.json(
        { error: 'Date range (from and to) is required' },
        { status: 400 }
      );
    }

    if (!invoiceData.issue_date) {
      return NextResponse.json(
        { error: 'Issue date is required' },
        { status: 400 }
      );
    }

    const projectId = invoiceData.project_id;

    // Verify the project exists and belongs to the user, and fetch pricing info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, rate_type, price, currency_code')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate invoice number
    const { invoiceNumber, error: invoiceNumberError } =
      await generateInvoiceNumber(
        supabase,
        user.id,
        invoiceData.invoice_number
      );

    if (invoiceNumberError || !invoiceNumber) {
      return NextResponse.json(
        { error: invoiceNumberError || 'Failed to generate invoice number' },
        { status: 400 }
      );
    }

    // Parse date range
    const fromDate = new Date(invoiceData.date_range.from);
    const toDate = new Date(invoiceData.date_range.to);
    toDate.setHours(23, 59, 59, 999); // Include the entire end date

    // Fetch stopped time entries within date range for this project
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select(
        `
        id,
        task_id,
        duration_seconds,
        start_time,
        end_time,
        task:task_id (
          id,
          name,
          description,
          rate_type,
          price,
          currency_code
        )
      `
      )
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('timer_status', 'stopped')
      .gte('end_time', fromDate.toISOString())
      .lte('end_time', toDate.toISOString())
      .order('end_time', { ascending: true });

    if (timeEntriesError) {
      console.error('Error fetching time entries:', timeEntriesError);
      return NextResponse.json(
        { error: 'Failed to fetch time entries' },
        { status: 500 }
      );
    }

    if (!timeEntries || timeEntries.length === 0) {
      return NextResponse.json(
        { error: 'No stopped time entries found in the selected date range' },
        { status: 400 }
      );
    }

    // Group time entries by task and calculate totals
    const taskGroups = new Map<
      string,
      {
        task: {
          id: string;
          name: string;
          description?: string;
          rate_type?: string | null;
          price?: number | null;
          currency_code?: string | null;
        };
        totalDurationSeconds: number;
        timeEntryIds: string[];
      }
    >();

    for (const entry of timeEntries) {
      // Supabase returns task as an object (not array) when using single foreign key relation
      const task = entry.task as unknown as {
        id: string;
        name: string;
        description?: string;
        rate_type?: string | null;
        price?: number | null;
        currency_code?: string | null;
      };

      if (!taskGroups.has(entry.task_id)) {
        taskGroups.set(entry.task_id, {
          task,
          totalDurationSeconds: 0,
          timeEntryIds: [],
        });
      }

      const group = taskGroups.get(entry.task_id)!;
      group.totalDurationSeconds += entry.duration_seconds;
      group.timeEntryIds.push(entry.id);
    }

    // Calculate invoice items
    const currencyCode =
      invoiceData.currency_code || project.currency_code || 'USD';
    const invoiceItems: Array<{
      task_id: string | null;
      name: string;
      description?: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
    }> = [];
    let subtotal = 0;

    for (const [, group] of taskGroups) {
      const { task, totalDurationSeconds } = group;

      // Determine rate: task rate → project rate → fallback to 0
      let rateType: 'hourly' | 'fixed' | null = null;
      let rate: number = 0;

      if (task.rate_type && task.price !== null && task.price !== undefined) {
        rateType = task.rate_type as 'hourly' | 'fixed';
        rate = task.price;
      } else if (
        project.rate_type &&
        project.price !== null &&
        project.price !== undefined
      ) {
        rateType = project.rate_type as 'hourly' | 'fixed';
        rate = project.price;
      }

      let quantity = 1;
      let unitCost = 0;

      if (rateType === 'hourly' && rate > 0) {
        // Calculate hours from seconds
        const hours = totalDurationSeconds / 3600;
        quantity = hours;
        unitCost = rate;
      } else if (rateType === 'fixed' && rate > 0) {
        // Fixed price per task
        quantity = 1;
        unitCost = rate;
      } else {
        // No rate defined - still create item but with 0 cost
        const hours = totalDurationSeconds / 3600;
        quantity = hours;
        unitCost = 0;
      }

      // Round to 2 decimals so DB constraint total_cost = quantity * unit_cost holds
      const q = Math.round(quantity * 100) / 100;
      const u = Math.round(unitCost * 100) / 100;
      const itemTotal = Math.round(q * u * 100) / 100;

      invoiceItems.push({
        task_id: task.id,
        name: task.name,
        description: task.description || undefined,
        quantity: q,
        unit_cost: u,
        total_cost: itemTotal,
      });

      subtotal += itemTotal;
    }

    if (invoiceItems.length === 0) {
      return NextResponse.json(
        { error: 'No invoice items to create' },
        { status: 400 }
      );
    }

    // Calculate tax and total
    const taxRate = invoiceData.tax_rate || 0;
    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    // Create invoice
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        project_id: projectId,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date || null,
        payment_terms: invoiceData.payment_terms || 'NET 30',
        subtotal: Math.round(subtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency_code: currencyCode,
        notes: invoiceData.notes || null,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    // Create invoice items
    const itemsToInsert = invoiceItems.map(item => ({
      invoice_id: newInvoice.id,
      task_id: item.task_id,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_cost: item.total_cost,
    }));

    const { data: newInvoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError);
      // Rollback: delete the invoice if items creation fails
      await supabase.from('invoices').delete().eq('id', newInvoice.id);
      return NextResponse.json(
        { error: 'Failed to create invoice items' },
        { status: 500 }
      );
    }

    // Fetch the complete invoice with items
    const { data: invoiceWithItems, error: fetchError } = await supabase
      .from('invoices')
      .select(
        `
        *,
        items:invoice_items (*)
      `
      )
      .eq('id', newInvoice.id)
      .single();

    if (fetchError) {
      console.error('Error fetching created invoice:', fetchError);
      // Invoice and items were created, but we can't fetch it - return what we have
      return NextResponse.json({
        invoice: newInvoice,
        items: newInvoiceItems,
        message: 'Invoice created successfully',
      });
    }

    return NextResponse.json(
      {
        invoice: invoiceWithItems,
        message: 'Invoice created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in invoices POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
