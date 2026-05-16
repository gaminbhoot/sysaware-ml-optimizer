import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) => {
  const isDanger = variant === 'danger';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
          isDanger ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500' : 'bg-emerald/10 border border-emerald/20 text-emerald'
        }`}>
          {isDanger ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
        </div>
        
        <p className="text-silver/80 mb-8 leading-relaxed">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-white/5 text-silver/60 hover:bg-white/10 hover:text-white transition-all font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-3 rounded-xl transition-all font-bold shadow-lg ${
              isDanger 
                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20' 
                : 'bg-emerald text-white hover:bg-emerald-600 shadow-emerald/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
