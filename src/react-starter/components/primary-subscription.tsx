'use client';

import * as React from 'react';
import type { PortalData } from '@freemius/sdk';
import { SectionHeading } from './section-heading';
import { useLocale } from '../utils/locale';
import { CancelSubscription } from './cancel-subscription';
import { SubscriptionInfo } from './subscription-info';

export function PrimarySubscription(props: {
  subscription: NonNullable<PortalData['subscriptions']['primary']>;
  cancellationCoupons?: PortalData['cancellationCoupons'];
  afterCancel?: () => void;
  afterCouponApplied?: () => void;
  commerceDisabled?: boolean;
}) {
  const {
    subscription,
    cancellationCoupons,
    afterCancel,
    afterCouponApplied,
    commerceDisabled = false,
  } = props;
  const [isCancelling, setIsCancelling] = React.useState<boolean>(false);
  const locale = useLocale();

  return (
    <div className="fs-saas-starter-portal__primary-subscription">
      <SectionHeading>{locale.portal.primary.title()}</SectionHeading>
      {isCancelling ? (
        <CancelSubscription
          subscription={subscription}
          onClose={() => setIsCancelling(false)}
          cancellationCoupons={cancellationCoupons}
          afterCancel={afterCancel}
          afterCouponApplied={afterCouponApplied}
        />
      ) : (
        <SubscriptionInfo
          onCancel={() => setIsCancelling(true)}
          subscription={subscription}
          commerceDisabled={commerceDisabled}
        />
      )}
    </div>
  );
}
