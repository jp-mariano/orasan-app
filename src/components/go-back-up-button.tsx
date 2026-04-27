'use client';

import { useEffect, useState, type RefObject } from 'react';

import { ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GoBackUpButtonProps = {
  /** Ref attached to the hero section. Button shows when the hero is out of view. */
  sectionRef: RefObject<HTMLElement | null>;
};

export function GoBackUpButton({ sectionRef }: GoBackUpButtonProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ob = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting);
      },
      { root: null, threshold: 0, rootMargin: '0px' }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [sectionRef]);

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
