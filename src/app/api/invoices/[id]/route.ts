import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { UpdateInvoiceRequest } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: invoiceId } = await params;

    // Fetch the invoice with items and verify ownership
    const { data: invoice, error: invoiceError } = await supabase
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
          *
        )
      `
      )
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error in invoice GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: invoiceId } = await params;
    const updateData: UpdateInvoiceRequest = await request.json();

    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // First check if the invoice exists, belongs to the user, and is in draft status
    const { data: existingInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, invoice_number, subtotal, tax_rate, currency_code')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only allow updates to draft invoices
    if (existingInvoice.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'Only draft invoices can be updated',
          current_status: existingInvoice.status,
        },
        { status: 400 }
      );
    }

    // If invoice_number is being updated, validate uniqueness
    if (updateData.invoice_number) {
      const trimmedNumber = updateData.invoice_number.trim();
      if (!trimmedNumber) {
        return NextResponse.json(
          { error: 'Invoice number cannot be empty' },
          { status: 400 }
        );
      }

      // Check if invoice number already exists for this user (excluding current invoice)
      const { data: existingInvoiceWithNumber, error: checkError } =
        await supabase
          .from('invoices')
          .select('id')
          .eq('user_id', user.id)
          .eq('invoice_number', trimmedNumber)
          .neq('id', invoiceId)
          .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is what we want
        console.error('Error checking invoice number uniqueness:', checkError);
        return NextResponse.json(
          { error: 'Failed to validate invoice number' },
          { status: 500 }
        );
      }

      if (existingInvoiceWithNumber) {
        return NextResponse.json(
          {
            error: `Invoice number "${trimmedNumber}" already exists. Please choose a different number`,
          },
          { status: 400 }
        );
      }

      // Update the invoice_number in the update data
      updateData.invoice_number = trimmedNumber;
    }

    // Handle invoice items update if provided
    let newSubtotal = existingInvoice.subtotal || 0;
    if (updateData.items !== undefined) {
      // Validate items
      if (!Array.isArray(updateData.items)) {
        return NextResponse.json(
          { error: 'Items must be an array' },
          { status: 400 }
        );
      }

      if (updateData.items.length === 0) {
        return NextResponse.json(
          { error: 'Invoice must have at least one item' },
          { status: 400 }
        );
      }

      // Validate each item
      for (const item of updateData.items) {
        if (!item.name || item.name.trim() === '') {
          return NextResponse.json(
            { error: 'All items must have a name' },
            { status: 400 }
          );
        }
        if (item.quantity <= 0) {
          return NextResponse.json(
            { error: 'All items must have a quantity greater than 0' },
            { status: 400 }
          );
        }
        if (item.unit_cost < 0) {
          return NextResponse.json(
            { error: 'Unit cost cannot be negative' },
            { status: 400 }
          );
        }
        // Validate total_cost matches quantity * unit_cost (with rounding)
        const expectedTotal =
          Math.round(item.quantity * item.unit_cost * 100) / 100;
        const actualTotal = Math.round(item.total_cost * 100) / 100;
        if (Math.abs(expectedTotal - actualTotal) > 0.01) {
          return NextResponse.json(
            {
              error: `Item "${item.name}": total_cost must equal quantity × unit_cost`,
            },
            { status: 400 }
          );
        }
      }

      // Normalize items so total_cost = quantity × unit_cost (for DB constraint)
      const normalizedItems = updateData.items.map(item => {
        const q = Math.round(item.quantity * 100) / 100;
        const u = Math.round(item.unit_cost * 100) / 100;
        const total = Math.round(q * u * 100) / 100;
        return {
          ...item,
          quantity: q,
          unit_cost: u,
          total_cost: total,
          rate_type: item.rate_type ?? null,
        };
      });
      newSubtotal = normalizedItems.reduce(
        (sum, item) => sum + item.total_cost,
        0
      );
      newSubtotal = Math.round(newSubtotal * 100) / 100;
      // Keep normalized items for insert below
      (updateData as { items: typeof normalizedItems }).items = normalizedItems;
    }

    // Prepare update payload (exclude items from invoice update, handle separately)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { items: _items, ...invoiceUpdateData } = updateData;
    const updatePayload = Object.fromEntries(
      Object.entries(invoiceUpdateData).filter(
        ([, value]) => value !== undefined
      )
    ) as Record<string, unknown>;

    // Calculate tax and total based on new subtotal
    const taxRate =
      updateData.tax_rate !== undefined
        ? updateData.tax_rate
        : existingInvoice.tax_rate || 0;
    const taxAmount = Math.round(((newSubtotal * taxRate) / 100) * 100) / 100;
    const totalAmount = Math.round((newSubtotal + taxAmount) * 100) / 100;

    // Add calculated fields to update payload
    updatePayload.subtotal = newSubtotal;
    if (updateData.tax_rate !== undefined) {
      updatePayload.tax_rate = taxRate;
    }
    updatePayload.tax_amount = taxAmount;
    updatePayload.total_amount = totalAmount;

    // Update invoice items if provided
    if (updateData.items !== undefined) {
      // Delete all existing items
      const { error: deleteItemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      if (deleteItemsError) {
        console.error(
          'Error deleting existing invoice items:',
          deleteItemsError
        );
        return NextResponse.json(
          { error: 'Failed to update invoice items' },
          { status: 500 }
        );
      }

      // Insert new items (already normalized above: total_cost = quantity × unit_cost)
      const itemsToInsert = updateData.items.map(item => ({
        invoice_id: invoiceId,
        task_id: item.task_id || null,
        name: item.name.trim(),
        description: item.description?.trim() || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        rate_type: item.rate_type ?? null,
      }));

      const { error: insertItemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertItemsError) {
        console.error('Error inserting invoice items:', insertItemsError);
        return NextResponse.json(
          { error: 'Failed to create invoice items' },
          { status: 500 }
        );
      }
    }

    // Update the invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .eq('status', 'draft') // Double-check status is still draft
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Fetch the complete invoice with items
    const { data: invoiceWithItems, error: fetchUpdatedError } = await supabase
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
          *
        )
      `
      )
      .eq('id', invoiceId)
      .single();

    if (fetchUpdatedError) {
      console.error('Error fetching updated invoice:', fetchUpdatedError);
      // Invoice was updated, but we can't fetch it - return what we have
      return NextResponse.json({
        invoice: updatedInvoice,
        message: 'Invoice updated successfully',
      });
    }

    return NextResponse.json({
      invoice: invoiceWithItems,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    console.error('Error in invoice PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: invoiceId } = await params;

    // First check if the invoice exists and belongs to the user
    const { data: existingInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Delete the invoice (cascade will handle invoice_items)
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting invoice:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Invoice deleted successfully',
      deletedInvoice: existingInvoice,
    });
  } catch (error) {
    console.error('Error in invoice DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
