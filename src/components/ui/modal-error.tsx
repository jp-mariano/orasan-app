import { X } from 'lucide-react';

interface ModalErrorProps {
  errorMessage: string | null;
  onClose: () => void;
  variant?: 'inline' | 'prominent';
}

export function ModalError({
  errorMessage,
  onClose,
  variant = 'prominent',
}: ModalErrorProps) {
  if (!errorMessage) return null;

  if (variant === 'inline') {
    return <p className="text-sm text-red-500">{errorMessage}</p>;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          <p className="text-sm text-red-700 font-bold">Validation Error</p>
          <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
