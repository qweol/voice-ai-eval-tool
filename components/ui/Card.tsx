import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
  hover?: boolean;
}

export function Card({ children, className = '', featured = false, hover = true }: CardProps) {
  const baseStyles = 'bg-card border-2 border-foreground rounded-xl p-6 transition-all duration-300 ease-bounce';
  const shadowStyle = featured ? 'shadow-card-pink' : 'shadow-card';
  const hoverStyle = hover ? 'hover:-translate-y-1 hover:scale-[1.02]' : '';

  return (
    <div className={`${baseStyles} ${shadowStyle} ${hoverStyle} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function CardHeader({ children, icon, badge }: CardHeaderProps) {
  return (
    <div className="mb-4 relative">
      {icon && (
        <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white border-2 border-foreground shadow-pop">
          {icon}
        </div>
      )}
      {badge && (
        <div className="mb-2">
          {badge}
        </div>
      )}
      <h3 className="text-2xl font-heading font-bold text-foreground">{children}</h3>
    </div>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-mutedForeground ${className}`}>
      {children}
    </div>
  );
}

