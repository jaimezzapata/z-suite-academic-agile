"use client";

import React, { useState } from "react";
import { Clock, X, Save, AlertTriangle } from "lucide-react";

interface TimeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hours: number, minutes: number, observation: string) => Promise<void>;
}

export const TimeReportModal: React.FC<TimeReportModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [hours, setHours] = useState<number | "">("");
  const [minutes, setMinutes] = useState<number | "">("");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const h = typeof hours === "number" ? hours : 0;
    const m = typeof minutes === "number" ? minutes : 0;

    if (h === 0 && m === 0) {
      setError("Debes ingresar al menos 1 minuto de tiempo invertido.");
      return;
    }

    if (m >= 60) {
      setError("Los minutos deben ser menores a 60. Por favor ajusta las horas.");
      return;
    }

    if (h > 4 || (h === 4 && m > 0)) {
      setError("No puedes reportar más de 4 horas en un solo registro.");
      return;
    }

    if (!observation.trim()) {
      setError("Por favor, agrega una breve observación sobre lo que hiciste.");
      return;
    }

    setLoading(true);
    try {
      await onSave(h, m, observation.trim());
      setHours("");
      setMinutes("");
      setObservation("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-emerald" />
            Reportar Tiempo Dedicado
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-zinc-400">
            Registra el tiempo que le has dedicado al desarrollo del proyecto. Este reporte se agregará a las métricas.
          </p>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Horas</label>
              <input
                type="number"
                min="0"
                step="1"
                value={hours}
                onChange={(e) => setHours(e.target.value === "" ? "" : parseInt(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 transition-all"
                placeholder="Ej: 2"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Minutos</label>
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value === "" ? "" : parseInt(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 transition-all"
                placeholder="Ej: 30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Observaciones</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="¿En qué trabajaste durante este tiempo? (Ej: Revisión de la base de datos, ajuste de interfaz...)"
              className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 transition-all resize-none custom-scrollbar"
            />
          </div>

          {error && (
            <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-brand-emerald hover:bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-brand-emerald/20"
            >
              <Save className="w-4 h-4" />
              {loading ? "Guardando..." : "Guardar Reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
