"use client";

import React, { useState } from "react";
import { MessageSquare, AlertCircle } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (feedback: string) => void;
  cardTitle: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cardTitle,
}) => {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setError("La retroalimentación es obligatoria para realizar la devolución.");
      return;
    }
    setError(null);
    onConfirm(feedback);
    setFeedback("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-zinc-950 border border-white/5 rounded-2xl shadow-2xl glass-panel p-6 animate-slide-up space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-rose/10 flex items-center justify-center text-brand-rose flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Retroalimentación Obligatoria</h3>
            <p className="text-xs text-gray-400 mt-1 leading-normal">
              Estás devolviendo la tarjeta <span className="text-brand-purple font-medium">"{cardTitle}"</span>. 
              Por favor, detalla los motivos para guiar al equipo en la corrección.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              placeholder="Escribe el feedback aquí (ej. 'Falta agregar pruebas unitarias', 'El diseño responsivo se rompe en celulares')..."
              rows={4}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (error) setError(null);
              }}
              className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl p-3 placeholder-gray-500 focus:outline-none focus:border-brand-rose focus:ring-1 focus:ring-brand-rose/30 resize-none"
            />
            {error && (
              <p className="text-[10px] text-brand-rose flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs font-semibold text-gray-300 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-rose text-white text-xs font-semibold rounded-xl hover:bg-brand-rose/90 transition-all shadow-md shadow-brand-rose/20 cursor-pointer"
            >
              Enviar y Devolver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
