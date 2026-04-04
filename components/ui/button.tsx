import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'default' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-blue-600 text-white hover:bg-blue-500',
  outline: 'border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))]',
  ghost: 'bg-transparent hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))]',
  destructive: 'bg-red-600 text-white hover:bg-red-500',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
