import currencyCodes from 'currency-codes';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
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

// Create a comprehensive currency list with symbols
export const currencies: Currency[] = allCurrencies.map(code => {
  const currencyData = currencyCodes.code(code);

  if (!currencyData) {
    return {
      code,
      name: code,
      symbol: code,
      digits: 2,
    };
  }

  // Get currency symbol based on code
  const symbol = getCurrencySymbol(code);

  return {
    code: currencyData.code,
    name: currencyData.currency,
    symbol,
    digits: currencyData.digits,
  };
});

// Currency symbol mapping for major currencies
function getCurrencySymbol(code: string): string {
  const symbolMap: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    CZK: 'Kč',
    HUF: 'Ft',
    RUB: '₽',
    TRY: '₺',
    KRW: '₩',
    SGD: 'S$',
    HKD: 'HK$',
    TWD: 'NT$',
    THB: '฿',
    MYR: 'RM',
    IDR: 'Rp',
    PHP: '₱',
    INR: '₹',
    MXN: '$',
    BRL: 'R$',
    ARS: '$',
    CLP: '$',
    COP: '$',
    PEN: 'S/',
    ZAR: 'R',
    EGP: '£',
    NGN: '₦',
    KES: 'KSh',
    MAD: 'MAD',
    SAR: 'ر.س',
    AED: 'د.إ',
    ILS: '₪',
    NZD: 'NZ$',
    FJD: 'FJ$',
  };

  return symbolMap[code] || code;
}

// Helper function to get currency by code
export function getCurrencyByCode(code: string): Currency | undefined {
  return currencies.find(currency => currency.code === code);
}

// Helper function to format price with currency
export function formatPriceWithCurrency(
  price: number,
  currencyCode: string
): string {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return `${price}`;

  return `${currency.symbol}${price}`;
}

// Default currency
export const DEFAULT_CURRENCY = 'USD';
