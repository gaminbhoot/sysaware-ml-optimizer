import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "text-emerald bg-emerald/10 border-emerald/20",
  warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  error: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  neutral: "text-muted bg-white/5 border-white/10"
};

/**
 * Premium Status Badge.
 * Uses atomic classes and design tokens for consistency.
 */
export const Badge = React.memo(({ variant = 'neutral', children, className, ...props }: BadgeProps) => {
  return (
    <span 
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase border",
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
