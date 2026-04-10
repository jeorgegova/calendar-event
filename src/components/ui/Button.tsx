import React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-apple-blue text-white hover:bg-[#155dd4] shadow-[0_0_8px_rgba(26,109,255,0.3),0_0_16px_rgba(26,109,255,0.1)] hover:shadow-[0_0_10px_rgba(26,109,255,0.35),0_0_20px_rgba(26,109,255,0.15)]",
      secondary: "bg-[#e5e5ea] text-[#1d1d1f] hover:bg-[#d1d1d6]",
      outline: "border border-[#c6c6c8] bg-transparent text-[#1d1d1f] hover:bg-black/5 hover:border-black/20",
      danger: "bg-[#ff3b30] text-white hover:bg-[#db251b]",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
