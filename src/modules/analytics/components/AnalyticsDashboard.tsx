"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../../shared/components/Layout";
import { useAuth } from "../../auth/hooks/useAuth";
import { useAnalytics } from "../hooks/useAnalytics";
import { projectService, Project } from "../../shared/services/firebase";
import {
  BarChart3,
  TrendingUp,
  Clock,
  ThumbsDown,
  AlertTriangle,
  Award,
  BookOpen,
  HelpCircle
} from "lucide-react";

export const AnalyticsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedCourse, selectedProjectId, setSelectedProjectId } = useDashboard();
  const { analytics, loading, error } = useAnalytics(
    selectedCourse?.id || "",
    selectedProjectId
  );

  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!selectedCourse) return;
      try {
        const list = await projectService.getProjects(selectedCourse.id);
        setProjects(list);
      } catch (e) {
        console.error(e);
      }
    };
    loadProjects();
  }, [selectedCourse]);

  if (!selectedCourse) return null;

  // Colores minimalistas para el gráfico SVG Donut
  const colors = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171"];

  // Renderizar Donut Chart SVG
  const renderDonutChart = () => {
    if (!analytics || analytics.studentsAnalytics.length === 0) return null;
    
    // Filtrar estudiantes con participación > 0
    const studentsWithPart = analytics.studentsAnalytics.filter((s) => s.participation > 0);
    if (studentsWithPart.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-xs text-gray-500 italic">
          Sin tareas completadas aún para generar el gráfico.
        </div>
      );
    }

    let accumulatedAngle = 0;
    const radius = 55;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
        {/* SVG Donut */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="16" />
            {studentsWithPart.map((student, i) => {
              const strokeDasharray = `${(student.participation / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedAngle;
              accumulatedAngle += (student.participation / 100) * circumference;
              const color = colors[i % colors.length];

              return (
                <circle
                  key={student.studentId}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth="16"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-white">P_ind</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-wider">Participación</span>
          </div>
        </div>

        {/* Leyenda */}
        <div className="space-y-2 flex-1 max-w-[200px]">
          {studentsWithPart.map((student, i) => (
            <div key={student.studentId} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="text-gray-300 truncate max-w-[120px]" title={student.name}>
                  {student.name}
                </span>
              </div>
              <span className="font-bold text-white">{student.participation}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-purple" />
            Métricas de Rendimiento y Evaluación
          </h2>
          <p className="text-xs text-gray-400">
            {currentUser?.role === "estudiante"
              ? "Visualiza las métricas individuales de tu equipo y el avance grupal."
              : "Selecciona un proyecto para evaluar las métricas individuales de procrastinación, participación y lead time grupal."}
          </p>
        </div>

        {currentUser?.role === "docente" && (
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="text-xs bg-zinc-900 border border-white/5 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple cursor-pointer min-w-[200px]"
          >
            <option value="" disabled>Seleccionar Proyecto...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!selectedProjectId ? (
        <div className="p-12 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
          Por favor, selecciona un proyecto para visualizar el panel de métricas.
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-xs text-gray-400">Calculando métricas analíticas...</div>
      ) : !analytics ? (
        <div className="p-12 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
          No hay datos suficientes para mostrar analíticas en este proyecto.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Fila 1: Métricas de Rendimiento Grupal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lead Time */}
            <div className="p-5 bg-zinc-900 border border-white/5 rounded-2xl glass-panel space-y-2 relative overflow-hidden">
              <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Lead Time del Grupo (LT_grupo)</p>
              <h3 className="text-2xl font-black text-white pt-1">
                {analytics.leadTime} <span className="text-xs text-gray-400 font-normal">horas</span>
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Tiempo promedio desde que un requisito nace en el Backlog hasta que es aprobado en Completado.
              </p>
            </div>

            {/* Tasa de Rechazo */}
            <div className="p-5 bg-zinc-900 border border-white/5 rounded-2xl glass-panel space-y-2 relative overflow-hidden">
              <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-brand-rose/10 flex items-center justify-center text-brand-rose">
                <ThumbsDown className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tasa de Rechazo (TR_grupo)</p>
              <h3 className={`text-2xl font-black pt-1 ${analytics.rejectionRate > 30 ? "text-brand-rose" : "text-white"}`}>
                {analytics.rejectionRate}%
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Porcentaje de devoluciones desde "En Revisión" hacia "En Progreso".
              </p>

              {/* Alerta si la tasa de rechazo supera el 30% */}
              {analytics.rejectionRate > 30 && (
                <div className="flex items-start gap-1.5 p-2 bg-brand-rose/10 border border-brand-rose/10 rounded-lg text-[10px] text-brand-rose font-medium animate-pulse mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Tasa alta (&gt; 30%): Indica que el grupo no tiene claros los criterios de aceptación y trabaja por prueba y error.
                  </span>
                </div>
              )}
            </div>

            {/* Avance del Tablero */}
            <div className="p-5 bg-zinc-900 border border-white/5 rounded-2xl glass-panel space-y-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Avance de Historias de Usuario</p>
              
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-brand-emerald">
                  {analytics.completedCount} / {analytics.totalCount}
                </span>
                <span className="text-xs text-gray-400">
                  {analytics.totalCount > 0
                    ? Math.round((analytics.completedCount / analytics.totalCount) * 100)
                    : 0}
                  % completado
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-purple to-brand-blue rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      analytics.totalCount > 0
                        ? (analytics.completedCount / analytics.totalCount) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Fila 2: Donut Chart de Participación y Métricas Individuales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Donut de Participación */}
            <div className="lg:col-span-1 p-5 bg-zinc-900 border border-white/5 rounded-2xl glass-panel space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Distribución de Contribución (P_ind)
              </h4>
              {renderDonutChart()}
            </div>

            {/* Listado y Detalle de Estudiantes */}
            <div className="lg:col-span-2 p-5 bg-zinc-900 border border-white/5 rounded-2xl glass-panel space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Detalle Métrico de Estudiantes
              </h4>

              <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#090d16]/30">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-white/2 text-gray-400 border-b border-white/5 font-semibold">
                      <th className="p-3">Estudiante</th>
                      <th className="p-3 text-center">HU Aprobadas</th>
                      <th className="p-3 text-center">P_ind (Participación)</th>
                      <th className="p-3">IP_ind (Procrastinación)</th>
                      <th className="p-3 text-center">TPP_ind (Progreso)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analytics.studentsAnalytics.map((student) => (
                      <tr key={student.studentId} className="hover:bg-white/1 text-gray-300">
                        <td className="p-3">
                          <p className="font-semibold text-white">{student.name}</p>
                          <p className="text-[10px] text-gray-500">{student.code}</p>
                        </td>
                        <td className="p-3 text-center font-bold text-white">
                          {student.tasksCompletedCount}
                        </td>
                        <td className="p-3 text-center font-black text-brand-purple">
                          {student.participation}%
                        </td>
                        <td className="p-3 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-semibold ${
                                student.procrastination > 50
                                  ? "text-brand-rose"
                                  : student.procrastination > 20
                                  ? "text-brand-amber"
                                  : "text-brand-emerald"
                              }`}
                            >
                              {student.procrastination}%
                            </span>
                            {student.procrastination > 50 && (
                              <span className="text-[8px] text-brand-rose bg-brand-rose/10 px-1 rounded uppercase font-bold animate-pulse">
                                ¡Procrastinador!
                              </span>
                            )}
                          </div>
                          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                student.procrastination > 50
                                  ? "bg-brand-rose"
                                  : student.procrastination > 20
                                  ? "bg-brand-amber"
                                  : "bg-brand-emerald"
                              }`}
                              style={{ width: `${student.procrastination}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold text-white">{student.avgTimeInProgress}</span>
                          <span className="text-[10px] text-gray-500 ml-1">h</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
