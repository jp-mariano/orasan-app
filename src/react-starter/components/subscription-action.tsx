'use client';

import { PortalSubscription } from '@freemius/sdk';
import { Button } from '@/components/ui/button';
import { useCheckout } from '../hooks/checkout';
import { useLocale } from '../utils/locale';

export function SubscriptionAction(props: {
  subscription: PortalSubscription;
  onCancel?: () => void;
}) {
  const { subscription, onCancel } = props;
  const locale = useLocale();
  const checkout = useCheckout();

  if (!subscription.isActive) {
    return (
      <Button
        className="w-full"
        onClick={() =>
          checkout.open({
            license_id: subscription.licenseId,
            authorization: subscription.checkoutUpgradeAuthorization,
            plan_id: subscription.planId,
          })
        }
      >
        {locale.portal.action.reactivate()}
      </Button>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {onCancel ? (
        <Button className="w-full" variant="outline" onClick={onCancel}>
          {locale.portal.action.cancel()}
        </Button>
      ) : null}
    </div>
  );
}
