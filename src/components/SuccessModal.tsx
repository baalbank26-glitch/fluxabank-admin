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
      <div className="w-full max-w-md bg-[#0f1713] rounded-2xl border border-emerald-500/20 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Sucesso</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-emerald-950/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="text-sm text-slate-300">{message}</p>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
