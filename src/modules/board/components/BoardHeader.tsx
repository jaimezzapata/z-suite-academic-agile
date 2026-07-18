import React from "react";
import { Briefcase, Upload, Download, Plus, Clock } from "lucide-react";
import { Project } from "../../shared/services/firebase";
import { CurrentUser } from "../../auth/hooks/useAuth";

interface BoardHeaderProps {
  activeProject: Project | null | undefined;
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  currentUser: CurrentUser | null;
  activeTab: string;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportJson: () => void;
  handleExportJson: () => void;
  handleOpenCreate: () => void;
  handleOpenTimeReport?: () => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  activeProject,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  currentUser,
  activeTab,
  handleFileChange,
  handleImportJson,
  handleExportJson,
  handleOpenCreate,
  handleOpenTimeReport
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-brand-purple" />
          {activeProject ? activeProject.name : "Planificación y Control Ágil (HUs)"}
        </h2>
        <p className="text-xs text-zinc-400">
          {activeProject
            ? "Tablero Kanban de Planificación y Control de Historias de Usuario"
            : "Selecciona el proyecto del curso que deseas auditar y calificar."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {currentUser?.role === "docente" && (
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-50 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple cursor-pointer min-w-[200px]"
          >
            <option value="" disabled>Seleccionar Proyecto...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.members.length} integrantes)
              </option>
            ))}
          </select>
        )}

        {selectedProjectId && (
          <>
            <input
              type="file"
              id="import-json-input"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={handleImportJson}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 hover:text-zinc-50 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
              title="Importar HUs desde archivo JSON"
            >
              <Upload className="w-3.5 h-3.5 text-brand-purple" />
              Importar
            </button>

            <button
              onClick={handleExportJson}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 hover:text-zinc-50 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
              title="Exportar HUs a formato JSON"
            >
              <Download className="w-3.5 h-3.5 text-brand-purple" />
              Exportar
            </button>
          </>
        )}

        {selectedProjectId && currentUser?.role === "estudiante" && handleOpenTimeReport && (
          <button
            onClick={handleOpenTimeReport}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald hover:bg-brand-emerald hover:text-zinc-900 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
            title="Reportar tiempo dedicado al proyecto"
          >
            <Clock className="w-3.5 h-3.5" />
            Reportar Tiempo
          </button>
        )}

        {selectedProjectId && activeTab === "backlog" && (
          <button
            onClick={handleOpenCreate}
            type="button"
            className="flex items-center gap-1 px-3.5 py-2 bg-brand-purple text-white text-xs font-semibold rounded-xl hover:bg-brand-purple/90 transition-all shadow-md shadow-brand-purple/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva HU
          </button>
        )}
      </div>
    </div>
  );
};
