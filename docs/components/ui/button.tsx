import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-500 dark:hover:bg-indigo-500 rounded-full',
        secondary: 'border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#1A2D48] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243A58] rounded-lg',
        ghost: 'text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-900 dark:hover:text-[#E2E8F0] rounded-lg',
        destructive: 'bg-rose-600 dark:bg-rose-600 text-white hover:bg-rose-500 dark:hover:bg-rose-500 rounded-full',
        outline: 'border border-indigo-200 dark:border-indigo-600 text-indigo-600 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-500 dark:bg-indigo-600 rounded-lg',
      },
      size: {
        default: 'h-9 px-5 py-2',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-11 px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
