import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  showCancel?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  type = 'warning',
  showCancel = true
}) => {
  const icons = {
    danger: <AlertTriangle className="text-logo-danger" size={32} />,
    warning: <AlertTriangle className="text-orange-500" size={32} />,
    info: <HelpCircle className="text-logo-primary" size={32} />,
    success: <CheckCircle2 className="text-logo-success" size={32} />
  };

  const ringColors = {
    danger: 'bg-red-50',
    warning: 'bg-orange-50',
    info: 'bg-slate-50',
    success: 'bg-green-50'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[400px]"
    >
      <div className="flex flex-col items-center text-center p-2">
        {/* Icon Circle */}
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300",
          ringColors[type]
        )}>
          {icons[type]}
        </div>

        {/* Text Content */}
        <h3 className="text-xl font-bold text-logo-dark mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-logo-gray leading-relaxed mb-8">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-3">
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant={type === 'danger' ? 'danger' : 'success'}
            className="w-full h-12 text-base shadow-lg"
          >
            {confirmLabel}
          </Button>
          {showCancel && (
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full h-12 text-base border-none hover:bg-gray-100 text-logo-gray"
            >
              {cancelLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
