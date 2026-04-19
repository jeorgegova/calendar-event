import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, HelpCircle, CheckCircle2, Trash2 } from 'lucide-react';
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
  if (type === 'danger') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <h2 className="text-xl font-bold text-logo-dark tracking-tight text-center">
            {title}
          </h2>
        }
        className="max-w-[400px]"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={28} className="text-logo-danger" />
          </div>
          <p className="text-[15px] text-[#86868b]">
            {message}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3.5 rounded-2xl text-[15px] font-semibold text-[#1d1d1f] bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-3.5 rounded-2xl text-[15px] font-semibold text-white bg-logo-danger hover:bg-red-700 shadow-lg shadow-red-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={18} />
            {confirmLabel}
          </button>
        </div>
      </Modal>
    );
  }

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
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300",
          ringColors[type]
        )}>
          {icons[type]}
        </div>
        <h3 className="text-xl font-bold text-logo-dark mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-logo-gray leading-relaxed mb-8">
          {message}
        </p>
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
