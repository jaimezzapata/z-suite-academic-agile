"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../../shared/components/Layout";
import { boardService, ActivityLog, projectService, Project } from "../../shared/services/firebase";
import { History, User, Clock, FileText, Search } from "lucide-react";

export const AuditLogViewer: React.FC = () => {
  const { selectedCourse, selectedProjectId, setSelectedProjectId } = useDashboard();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjectsAndLogs = async () => {
      if (!selectedCourse) return;
      setLoading(true);
      try {
        const [projList, logList] = await Promise.all([
          projectService.getProjects(selectedCourse.id),
          boardService.getActivityLogs(selectedCourse.id, selectedProjectId || undefined),
        ]);
        setProjects(projList);
        setLogs(logList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadProjectsAndLogs();
  }, [selectedCourse, selectedProjectId]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      log.previous_status.toLowerCase().includes(search.toLowerCase()) ||
      log.new_status.toLowerCase().includes(search.toLowerCase()) ||
      log.task_id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getProjectName = (projId: string) => {
    const p = projects.find((proj) => proj.id === projId);
    return p ? p.name : "Proyecto Desconocido";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!selectedCourse) return null;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-brand-purple" />
            Historial de Auditoría Metodológica
          </h2>
          <p className="text-xs text-gray-400">
            Registro inmutable de transiciones de estado sobre las Historias de Usuario y Requisitos.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="text-xs bg-zinc-900 border border-white/5 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple cursor-pointer min-w-[150px]"
          >
            <option value="">Todos los Proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar operador, estado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs bg-transparent border-none text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400">Cargando registros de auditoría...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
          No se encontraron registros de auditoría que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="relative border-l border-white/10 pl-6 ml-4 space-y-6 py-2">
          {filteredLogs.map((log) => (
            <div key={log.id} className="relative text-xs">
              {/* Timeline dot */}
              <span className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-brand-purple border-4 border-[#05070c] shadow-lg shadow-brand-purple/50" />

              <div className="p-4 bg-zinc-900 border border-white/5 hover:border-brand-purple/20 rounded-2xl shadow transition-all glass-panel-light flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-brand-purple" />
                      {log.user_name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">•</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      {getProjectName(log.projectId)}
                    </span>
                  </div>

                  <p className="text-gray-300">
                    Cambió la tarjeta <code className="text-brand-purple font-semibold text-[10px]">#{log.task_id}</code> de{" "}
                    <span className="px-1.5 py-0.5 bg-black/40 text-gray-400 rounded text-[9px] border border-white/5">
                      {log.previous_status}
                    </span>{" "}
                    a{" "}
                    <span className="px-1.5 py-0.5 bg-brand-purple/20 text-brand-purple rounded text-[9px] border border-brand-purple/10 font-semibold">
                      {log.new_status}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] self-end md:self-center">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(log.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
