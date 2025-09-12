import { Button } from '@/components/ui/button';

interface ClearPricingButtonProps {
  onClear: () => void;
  hasPricingData: boolean;
  className?: string;
}

export function ClearPricingButton({
  onClear,
  hasPricingData,
  className = '',
}: ClearPricingButtonProps) {
  if (!hasPricingData) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClear}
      className={`text-gray-600 hover:text-gray-700 ${className}`}
    >
      Clear Pricing
    </Button>
  );
}
