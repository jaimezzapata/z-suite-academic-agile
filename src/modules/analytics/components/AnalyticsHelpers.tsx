import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    Backlog: "bg-zinc-800 text-zinc-400 border-zinc-700",
    "En Progreso": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "En Revisión": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Completado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${map[status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
      {status}
    </span>
  );
};

export const OnTimeBadge: React.FC<{ onTime: boolean | null }> = ({ onTime }) => {
  if (onTime === null)
    return <span className="text-[9px] text-zinc-500 font-semibold italic">Pendiente</span>;
  if (onTime)
    return (
      <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-bold">
        <CheckCircle2 className="w-3 h-3" /> A tiempo
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[9px] text-red-400 font-bold">
      <XCircle className="w-3 h-3" /> Tarde
    </span>
  );
};

export const CriteriaBar: React.FC<{ pct: number; done: number; total: number }> = ({ pct, done, total }) => (
  <div className="flex items-center gap-2 min-w-[120px]">
    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all duration-300 ${pct === 100 ? "bg-emerald-500" : "bg-brand-purple"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
    <span className="text-[9px] text-zinc-400 font-semibold whitespace-nowrap">{done}/{total}</span>
  </div>
);

export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "Sin fecha";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};
