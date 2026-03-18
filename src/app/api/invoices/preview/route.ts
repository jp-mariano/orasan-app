import { NextRequest, NextResponse } from 'next/server';

import { getUserSubscription } from '@/lib/subscription-enforcement';
import { createClient } from '@/lib/supabase/server';

export interface InvoicePreviewRequest {
  project_id: string;
  date_range: { from: string; to: string };
  tax_rate?: number;
  currency_code?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await getUserSubscription(supabase, user.id);
    if (tier !== 'pro') {
      return NextResponse.json(
        { error: 'Invoicing is available on Pro only.' },
        { status: 403 }
      );
    }

    const body: InvoicePreviewRequest = await request.json();
    const { project_id, date_range, tax_rate = 0, currency_code } = body;

    if (!project_id || !date_range?.from || !date_range?.to) {
      return NextResponse.json(
        { error: 'project_id and date_range (from, to) are required' },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(
        'id, name, rate_type, price, currency_code, client_name, client_email, client_address, client_phone'
      )
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const fromDate = new Date(date_range.from);
    const toDate = new Date(date_range.to);
    toDate.setHours(23, 59, 59, 999);

    const { data: timeEntriesRaw, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select(
        `
        id,
        task_id,
        duration_seconds,
        task:task_id (
          id,
          name,
          description,
          rate_type,
          price,
          status
        )
      `
      )
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .eq('timer_status', 'stopped')
      .gte('end_time', fromDate.toISOString())
      .lte('end_time', toDate.toISOString())
      .order('end_time', { ascending: true });

    if (timeEntriesError) {
      return NextResponse.json(
        { error: 'Failed to fetch time entries' },
        { status: 500 }
      );
    }

    const timeEntries = (timeEntriesRaw || []).filter(
      (entry: unknown) =>
        (entry as { task?: { status?: string } | null }).task?.status ===
        'completed'
    );

    const taskGroups = new Map<
      string,
      {
        task: {
          id: string;
          name: string;
          description?: string;
          rate_type?: string | null;
          price?: number | null;
        };
        totalDurationSeconds: number;
      }
    >();

    for (const entry of timeEntries) {
      const rawEntry = entry as {
        task_id: string;
        duration_seconds: number;
        task?: unknown;
      };
      const task = rawEntry.task as {
        id: string;
        name: string;
        description?: string;
        rate_type?: string | null;
        price?: number | null;
        status?: string;
      } | null;

      if (!task) continue;

      if (!taskGroups.has(rawEntry.task_id)) {
        taskGroups.set(rawEntry.task_id, {
          task,
          totalDurationSeconds: 0,
        });
      }

      const group = taskGroups.get(rawEntry.task_id)!;
      group.totalDurationSeconds += rawEntry.duration_seconds;
    }

    const resolvedCurrency = currency_code || project.currency_code || 'USD';
    const items: Array<{
      task_id: string;
      name: string;
      quantity: number;
      unit_price: number;
      total_cost: number;
      rate_type: 'hourly' | 'fixed' | null;
    }> = [];
    let subtotal = 0;

    for (const [, group] of taskGroups) {
      const { task, totalDurationSeconds } = group;

      let rateType: 'hourly' | 'fixed' | null = null;
      let rate = 0;

      if (task.rate_type && task.price != null) {
        rateType = task.rate_type as 'hourly' | 'fixed';
        rate = task.price;
      } else if (project.rate_type && project.price != null) {
        rateType = project.rate_type as 'hourly' | 'fixed';
        rate = project.price;
      }

      let quantity = 1;
      let unitCost = 0;

      if (rateType === 'hourly' && rate > 0) {
        quantity = totalDurationSeconds / 3600;
        unitCost = rate;
      } else if (rateType === 'fixed' && rate > 0) {
        quantity = 1;
        unitCost = rate;
      } else {
        quantity = totalDurationSeconds / 3600;
        unitCost = 0;
      }

      const q = Math.round(quantity * 100) / 100;
      const u = Math.round(unitCost * 100) / 100;
      const itemTotal = Math.round(q * u * 100) / 100;

      items.push({
        task_id: task.id,
        name: task.name,
        quantity: q,
        unit_price: u,
        total_cost: itemTotal,
        rate_type: rateType ?? null,
      });

      subtotal += itemTotal;
    }

    const taxAmount = Math.round(((subtotal * tax_rate) / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    return NextResponse.json({
      items,
      subtotal,
      tax_rate: tax_rate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency_code: resolvedCurrency,
      project: {
        name: project.name,
        client_name: project.client_name,
        client_email: project.client_email,
        client_address: project.client_address,
        client_phone: project.client_phone,
      },
    });
  } catch (error) {
    console.error('Error generating invoice preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
