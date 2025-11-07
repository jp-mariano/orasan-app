import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates the next invoice number for a user
 * If a custom invoice number is provided, validates it's unique
 * Otherwise, auto-generates by finding the highest numeric invoice number and incrementing
 *
 * @param supabase - Supabase client instance
 * @param userId - The user ID
 * @param customInvoiceNumber - Optional custom invoice number (will be validated for uniqueness)
 * @returns The invoice number to use
 */
export async function generateInvoiceNumber(
  supabase: SupabaseClient,
  userId: string,
  customInvoiceNumber?: string
): Promise<{ invoiceNumber: string; error?: string }> {
  try {
    // If custom invoice number is provided, validate it's unique
    if (customInvoiceNumber) {
      const trimmedNumber = customInvoiceNumber.trim();
      if (!trimmedNumber) {
        return {
          invoiceNumber: '',
          error: 'Invoice number cannot be empty',
        };
      }

      // Check if invoice number already exists for this user
      const { data: existingInvoice, error: checkError } = await supabase
        .from('invoices')
        .select('id')
        .eq('user_id', userId)
        .eq('invoice_number', trimmedNumber)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is what we want
        console.error('Error checking invoice number uniqueness:', checkError);
        return {
          invoiceNumber: '',
          error: 'Failed to validate invoice number',
        };
      }

      if (existingInvoice) {
        return {
          invoiceNumber: '',
          error: `Invoice number "${trimmedNumber}" already exists. Please choose a different number`,
        };
      }

      return { invoiceNumber: trimmedNumber };
    }

    // Auto-generate: Find the highest numeric invoice number
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('user_id', userId)
      .order('invoice_number', { ascending: false });

    if (fetchError) {
      console.error(
        'Error fetching invoices for number generation:',
        fetchError
      );
      return {
        invoiceNumber: '',
        error: 'Failed to generate invoice number',
      };
    }

    // Find the highest numeric invoice number
    let maxNumber = 0;
    if (invoices && invoices.length > 0) {
      for (const invoice of invoices) {
        const num = parseInt(invoice.invoice_number, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    // Increment by 1
    const nextNumber = maxNumber + 1;

    return { invoiceNumber: nextNumber.toString() };
  } catch (error) {
    console.error('Error in generateInvoiceNumber:', error);
    return {
      invoiceNumber: '',
      error: 'Failed to generate invoice number',
    };
  }
}
