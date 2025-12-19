import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  showArrow?: boolean;
}

export function Button({ 
  variant = 'primary', 
  children, 
  showArrow = false,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-full font-bold text-base transition-all duration-300 ease-bounce border-2 border-foreground';
  
  const variantStyles = {
    primary: 'bg-accent text-accentForeground shadow-pop hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-active disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-pop',
    secondary: 'bg-transparent text-foreground hover:bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      <span className="flex items-center gap-2">
        {children}
        {showArrow && variant === 'primary' && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-accent">
            <ArrowRight size={14} strokeWidth={2.5} />
          </span>
        )}
      </span>
    </button>
  );
}

