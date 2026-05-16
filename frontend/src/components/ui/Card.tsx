import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Premium glass-morphism Card component.
 * Optimized with React.memo for high-frequency updates in dashboards.
 */
export const Card = React.memo(({ children, className, ...props }: CardProps) => {
  return (
    <div 
      className={cn(
        "bg-white/[0.02] backdrop-blur-[24px] border border-white/[0.08] rounded-xl p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
