'use client';

import { useEffect, useState } from 'react';

import { ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Shows after the user scrolls past roughly one viewport height. */
export function GoBackUpButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={cn(
        'fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6',
        'transition-all duration-300 ease-out',
        show
          ? 'translate-y-0 opacity-100'
          : 'translate-y-3 opacity-0 pointer-events-none'
      )}
      aria-hidden={!show}
    >
      <Button
        type="button"
        variant="default"
        size="sm"
        className="gap-1.5 rounded-full shadow-lg pl-3 pr-4 sm:text-sm"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Go back up to the top of the page"
      >
        <ChevronUp className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
