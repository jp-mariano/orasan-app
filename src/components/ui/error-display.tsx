'use client';

import { AlertTriangle, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorDisplayProps {
  title: string;
  message: string;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}

export function ErrorDisplay({
  title,
  message,
  onBack,
  backLabel = 'Back to Dashboard',
  className = '',
}: ErrorDisplayProps) {
  return (
    <div className={`min-h-screen bg-gray-50 relative ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-red-200 bg-red-50 max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-red-800 mb-2">
                  {title}
                </h1>
                <p className="text-red-600 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {backLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
