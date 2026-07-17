import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-slide-up space-y-5 text-left z-10">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDanger ? 'bg-brand-rose/10 text-brand-rose' : 'bg-brand-blue/10 text-brand-blue'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
          </div>
          <button 
            onClick={onCancel}
            className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-transparent border border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl text-white transition-colors ${
              isDanger 
                ? 'bg-brand-rose hover:bg-brand-rose-hover' 
                : 'bg-brand-purple hover:bg-brand-purple-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
