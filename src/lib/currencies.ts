import currencyCodes from 'currency-codes';

export interface Currency {
  code: string;
  name: string;
  digits: number;
}

// Currencies to exclude (rarely used, testing currencies, etc.)
const excludedCurrencies = new Set([
  'USN', // US Dollar (Next day)
  'USS', // US Dollar (Same day)
  'XXX', // No currency
  'XTS', // Testing currency code
  'XSU', // Sucre
  'XPD', // Palladium
  'XPT', // Platinum
  'XAU', // Gold
  'XAG', // Silver
  'XDR', // Special Drawing Rights
  'XBA', // Bond Markets Unit European Composite Unit (EURCO)
  'XBB', // Bond Markets Unit European Monetary Unit (E.M.U.-6)
  'XBC', // Bond Markets Unit European Unit of Account 9 (E.U.A.-9)
  'XBD', // Bond Markets Unit European Unit of Account 17 (E.U.A.-17)
  'XFU', // French UIC-Franc
  'XFO', // French Gold-Franc
  'XRE', // RINET Funds
  'XUA', // ADB Unit of Account
]);

// Get all available currencies from the package and filter out excluded ones
const allCurrencies = currencyCodes
  .codes()
  .filter(code => !excludedCurrencies.has(code));

// Create a comprehensive currency list
export const currencies: Currency[] = allCurrencies.map(code => {
  const currencyData = currencyCodes.code(code);

  if (!currencyData) {
    return {
      code,
      name: code,
      digits: 2,
    };
  }

  return {
    code: currencyData.code,
    name: currencyData.currency,
    digits: currencyData.digits,
  };
});

// Helper function to get currency by code
export function getCurrencyByCode(code: string): Currency | undefined {
  return currencies.find(currency => currency.code === code);
}

function formatAmount(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// Format price with currency code and 2 decimals (e.g. "USD 99.50")
// Format price with optional currency code (e.g. "USD 99.50" or "99.50")
export function formatPriceWithCurrency(
  price: number,
  currencyCode: string,
  includeCurrencyCode = true
): string {
  const currency = getCurrencyByCode(currencyCode);
  const formatted = currency
    ? formatAmount(price, currency.digits)
    : formatAmount(price);
  if (!includeCurrencyCode || !currency) return formatted;
  return `${currency.code} ${formatted}`;
}

// Format price with optional rate type for display (e.g. "USD 100.00/hr")
export function formatPrice(
  price: number | null | undefined,
  rateType: string | null | undefined,
  currencyCode: string | null | undefined
): string | null {
  if (price === null || price === undefined || !rateType || !currencyCode)
    return null;

  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return formatAmount(price);

  const formatted = formatAmount(price, currency.digits);
  switch (rateType) {
    case 'hourly':
      return `${currency.code} ${formatted}/hr`;
    case 'monthly':
      return `${currency.code} ${formatted}/mo`;
    case 'fixed':
      return `${currency.code} ${formatted}`;
    default:
      return `${currency.code} ${formatted}`;
  }
}
