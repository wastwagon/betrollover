'use client';

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import {
  buttonClassName,
  sizeClass,
  variantClass,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/ui/button-styles';

export type { ButtonSize, ButtonVariant };
export { buttonClassName };

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      leading,
      trailing,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 active:scale-[0.99] disabled:cursor-not-allowed touch-manipulation',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  ),
);

Button.displayName = 'Button';
