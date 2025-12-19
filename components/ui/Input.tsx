import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full bg-input border-2 border-slate-300 rounded-lg px-4 py-3
          text-foreground focus:outline-none focus:border-accent focus:shadow-pop
          transition-all duration-300
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full bg-input border-2 border-slate-300 rounded-lg px-4 py-3
          text-foreground focus:outline-none focus:border-accent focus:shadow-pop
          transition-all duration-300 resize-none
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

