import React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-logo-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95";
    
    const variants = {
      primary: "bg-logo-primary text-white hover:bg-[#0f172a] shadow-[0_0_15px_rgba(30,41,59,0.2)] hover:shadow-[0_0_25px_rgba(30,41,59,0.35)]",
      success: "bg-logo-success text-white hover:bg-[#28ad4d] shadow-[0_0_15px_rgba(52,199,89,0.4)] hover:shadow-[0_0_25px_rgba(52,199,89,0.6)]",
      secondary: "bg-logo-light text-logo-dark hover:bg-slate-200 border border-slate-200/50",
      outline: "border border-slate-200 bg-transparent text-logo-dark hover:bg-slate-50 hover:border-slate-300",
      danger: "bg-logo-danger text-white hover:bg-[#e03126] shadow-[0_0_15px_rgba(255,59,48,0.4)] hover:shadow-[0_0_25px_rgba(255,59,48,0.6)]",
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
