import React, { useEffect } from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "md",
}) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-200" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={cn(
          "relative bg-white rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-y-auto z-10",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out",
          sizeClasses[size],
          className
        )}
      >
        {/* Close button — always visible */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all text-gray-400 hover:text-gray-600 z-10 active:scale-90"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {title && (
          <div className="px-8 pt-8 pb-0">
            {typeof title === 'string' ? (
              <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight">{title}</h2>
            ) : (
              title
            )}
          </div>
        )}
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
};
