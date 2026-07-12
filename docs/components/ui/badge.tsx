import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-indigo-100 dark:bg-indigo-900/35 text-indigo-700 dark:text-indigo-300',
        secondary: 'bg-slate-100 text-slate-600 dark:text-[#CBD5E1]',
        success: 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700',
        destructive: 'bg-rose-100 text-rose-700',
        outline: 'border border-slate-200 text-slate-600 dark:text-[#CBD5E1]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };