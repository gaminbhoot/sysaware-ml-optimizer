import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "text-emerald bg-emerald/10",
  warning: "text-amber-400 bg-amber-400/10",
  error: "text-rose-500 bg-rose-500/10",
  neutral: "text-muted bg-white/5"
};

/**
 * Premium Status Badge.
 * Uses atomic classes and design tokens for consistency.
 */
export const Badge = React.memo(({ variant = 'neutral', children, className, ...props }: BadgeProps) => {
  return (
    <span 
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase",
        variantStyles[variant],
        className
      )}
      role="status"
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';
