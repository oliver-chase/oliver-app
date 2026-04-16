'use client';

import { useRef, useEffect } from 'react';

interface InlineFormProps {
  children: React.ReactNode;
  onClickOutside?: () => void;
  className?: string;
}

export default function InlineForm({ children, onClickOutside, className }: InlineFormProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onClickOutside) return;
    let handler: (e: MouseEvent) => void;
    const timer = setTimeout(() => {
      handler = (e: MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          onClickOutside();
        }
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (handler) document.removeEventListener('mousedown', handler);
    };
  }, [onClickOutside]);

  const classes = ['inline-form', className].filter(Boolean).join(' ');

  return (
    <div className={classes} ref={wrapRef}>
      {children}
    </div>
  );
}
