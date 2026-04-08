import { CURRENCY, PortalData } from '@freemius/sdk';

export function getRenewalCouponDiscounts(
  coupon: NonNullable<PortalData['cancellationCoupons']>[number],
  renewalAmount: number,
  currency: CURRENCY,
  isPayPal: boolean
) {
  let percentageOff: number = 0;
  let dollarOff: number = 0;

  if (coupon.discount_type === 'percentage') {
    percentageOff = coupon.discount ?? 0;
    dollarOff = renewalAmount * (percentageOff / 100);
  } else {
    const basePrice = renewalAmount;
    dollarOff =
      coupon.discounts?.[currency] ??
      coupon.discounts?.[currency.toLowerCase()] ??
      0;

    if (basePrice > 0) {
      percentageOff = Math.round((dollarOff / basePrice) * 100);
    }
  }

  if (!coupon.has_renewals_discount && isPayPal) {
    // For PayPal, the maximum allowed discount is 16% for next renewal.
    percentageOff = Math.min(16, percentageOff);
    dollarOff = Math.min(renewalAmount * (16 / 100), dollarOff);
  }

  return { percentageOff, dollarOff } as const;
}
