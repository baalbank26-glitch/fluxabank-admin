import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  title,
  message,
  onClose
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-base font-bold text-slate-900">Sucesso</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-sm text-slate-600">{message}</p>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-fluxabank-500 text-white rounded-lg font-medium hover:bg-fluxabank-600 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
