"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../../shared/components/Layout";
import { useAuth } from "../../auth/hooks/useAuth";
import { useAnalytics, HUProgress } from "../hooks/useAnalytics";
import { projectService, Project } from "../../shared/services/firebase";
import {
  BarChart3,
  TrendingUp,
  Clock,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  User,
  BookOpen,
  RotateCcw,
  Calendar,
  Target,
} from "lucide-react";

// ─── Status chip helper ───────────────────────────────────────────────────────
const StatusChip: React.FC<{ status: string }> = ({ status }) => {
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

// ─── On-time badge helper ─────────────────────────────────────────────────────
const OnTimeBadge: React.FC<{ onTime: boolean | null }> = ({ onTime }) => {
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

// ─── Criteria progress bar ────────────────────────────────────────────────────
const CriteriaBar: React.FC<{ pct: number; done: number; total: number }> = ({ pct, done, total }) => (
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

// ─── Date formatter helper ────────────────────────────────────────────────────
const formatDate = (dateStr: string | null) => {
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

export const AnalyticsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedCourse, selectedProjectId, setSelectedProjectId } = useDashboard();
  const { analytics, loading, error } = useAnalytics(
    selectedCourse?.id || "",
    selectedProjectId
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

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

  const toggleStudent = (id: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
            <span className="text-sm font-bold text-white">Participación</span>
            <span className="text-[9px] text-gray-400 uppercase tracking-wider">Porcentaje</span>
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

  // Cálculo de Cumplimiento de Fechas Grupal
  const groupOnTime = analytics ? analytics.studentsAnalytics.reduce((acc, s) => acc + s.onTimeCount, 0) : 0;
  const groupLate = analytics ? analytics.studentsAnalytics.reduce((acc, s) => acc + s.lateCount, 0) : 0;
  const totalCompletedHUs = groupOnTime + groupLate;
  const complianceRate = totalCompletedHUs > 0 ? Math.round((groupOnTime / totalCompletedHUs) * 100) : 100;

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
            className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple cursor-pointer min-w-[200px]"
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
        <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500 dark:text-zinc-400">
          Por favor, selecciona un proyecto para visualizar el panel de métricas.
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-xs text-zinc-500 dark:text-zinc-400">Calculando métricas analíticas...</div>
      ) : !analytics ? (
        <div className="p-12 text-center bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500 dark:text-zinc-400">
          No hay datos suficientes para mostrar analíticas en este proyecto.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Fila 1: Métricas de Rendimiento Grupal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Avance del Tablero */}
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3 shadow-xs">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Progreso de Historias de Usuario</p>
              
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-brand-emerald">
                  {analytics.completedCount} / {analytics.totalCount}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {analytics.totalCount > 0
                    ? Math.round((analytics.completedCount / analytics.totalCount) * 100)
                    : 0}
                  % completado
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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

            {/* Lead Time */}
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 relative overflow-hidden shadow-xs">
              <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Tiempo de Entrega Grupal</p>
              <h3 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 pt-1">
                {analytics.leadTime} <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">horas</span>
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Tiempo promedio desde que una Historia de Usuario se crea en el Backlog hasta que se aprueba como Completado.
              </p>
            </div>

            {/* Tasa de Devoluciones */}
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 relative overflow-hidden shadow-xs">
              <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-brand-rose/10 flex items-center justify-center text-brand-rose">
                <ThumbsDown className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Tasa de Devoluciones del Grupo</p>
              <h3 className={`text-2xl font-black pt-1 ${analytics.rejectionRate > 30 ? "text-brand-rose" : "text-zinc-800 dark:text-zinc-100"}`}>
                {analytics.rejectionRate}%
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Porcentaje de devoluciones desde la etapa de "En Revisión" hacia atrás debido a observaciones.
              </p>

              {/* Alerta si la tasa de rechazo supera el 30% */}
              {analytics.rejectionRate > 30 && (
                <div className="flex items-start gap-1.5 p-2 bg-brand-rose/10 border border-brand-rose/10 rounded-lg text-[10px] text-brand-rose font-medium animate-pulse mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Tasa alta (&gt; 30%): Indica que el grupo no tiene claros los criterios de aceptación y está cometiendo errores repetitivos.
                  </span>
                </div>
              )}
            </div>

            {/* Cumplimiento de Fechas Grupal */}
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 relative overflow-hidden shadow-xs">
              <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-brand-emerald/10 flex items-center justify-center text-brand-emerald">
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Cumplimiento de Fechas Grupal</p>
              <h3 className={`text-2xl font-black pt-1 ${complianceRate < 70 ? "text-brand-amber" : "text-zinc-800 dark:text-zinc-100"}`}>
                {complianceRate}%
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Porcentaje de Historias de Usuario completadas que fueron entregadas en o antes de su fecha límite asignada.
              </p>
            </div>
          </div>

          {/* Fila 2: Donut Chart de Participación y Métricas Individuales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Donut de Participación */}
            <div className="lg:col-span-1 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Distribución de Contribución por Estudiante
              </h4>
              {renderDonutChart()}
            </div>

            {/* Listado y Detalle de Estudiantes */}
            <div className="lg:col-span-2 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Desempeño Individual de Estudiantes
              </h4>

              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-800 font-semibold">
                      <th className="p-3">Estudiante</th>
                      <th className="p-3 text-center">Historias Completadas</th>
                      <th className="p-3 text-center">Participación</th>
                      <th className="p-3">Índice de Procrastinación</th>
                      <th className="p-3 text-center">Tiempo en Progreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {analytics.studentsAnalytics.map((student) => {
                      const isExpanded = expandedStudents.has(student.studentId);
                      return (
                        <React.Fragment key={student.studentId}>
                          {/* Fila Principal del Estudiante */}
                          <tr 
                            className={`hover:bg-zinc-900/40 cursor-pointer transition-colors text-zinc-600 dark:text-zinc-300 ${isExpanded ? 'bg-zinc-900/20 font-medium' : ''}`}
                            onClick={() => toggleStudent(student.studentId)}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="font-semibold text-zinc-800 dark:text-zinc-100">{student.name}</p>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{student.code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-zinc-800 dark:text-zinc-100">
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
                              <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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
                              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{student.avgTimeInProgress}</span>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-1">h</span>
                            </td>
                          </tr>

                          {/* Fila Detallada del Estudiante (Expandible) */}
                          {isExpanded && (
                            <tr className="bg-zinc-900/20">
                              <td colSpan={5} className="p-4 border-t border-b border-zinc-800">
                                <div className="space-y-5 animate-slide-up text-left">
                                  {/* Resumen de Métricas */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Progreso */}
                                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 shadow-sm">
                                      <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Progreso de Requisitos</p>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-zinc-800 dark:text-zinc-100">{student.overallProgress}%</span>
                                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400">criterios de aceptación completados</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-brand-purple rounded-full transition-all duration-300"
                                          style={{ width: `${student.overallProgress}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Cumplimiento de Fechas */}
                                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 flex flex-col justify-center shadow-sm">
                                      <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Cumplimiento de Fechas Límite</p>
                                      <div className="flex items-center gap-3 text-xs pt-1">
                                        <span className="text-emerald-500 dark:text-emerald-400 font-bold">
                                          A tiempo: {student.onTimeCount}
                                        </span>
                                        <span className="text-zinc-500">|</span>
                                        <span className="text-brand-rose font-bold">
                                          Tarde: {student.lateCount}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Devoluciones */}
                                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 flex flex-col justify-center shadow-sm">
                                      <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Observaciones / Devoluciones</p>
                                      <p className="text-xs pt-1 text-zinc-700 dark:text-zinc-300">
                                        Entregas devueltas por el docente: <span className={`font-black text-sm ml-1 ${student.totalRejections > 2 ? 'text-brand-rose' : 'text-zinc-800 dark:text-zinc-100'}`}>{student.totalRejections}</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Listado de Historias de Usuario */}
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                      <BookOpen className="w-4 h-4 text-brand-purple" />
                                      Historias de Usuario Asignadas ({student.assignedHUs})
                                    </p>
                                    {student.huDetails.length === 0 ? (
                                      <p className="text-xs text-zinc-500 italic p-2">Este estudiante no tiene Historias de Usuario asignadas en este proyecto.</p>
                                    ) : (
                                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {student.huDetails.map((hu) => {
                                          const isOverdue = hu.status !== "Completado" && hu.dueDate && new Date() > new Date(hu.dueDate + "T23:59:59");
                                          return (
                                            <div key={hu.huId} className="p-3 bg-zinc-950 border border-zinc-800 shadow-sm rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-zinc-700 transition-colors">
                                              <div className="space-y-1 max-w-[65%]">
                                                <p className="font-semibold text-zinc-800 dark:text-zinc-100">{hu.title}</p>
                                                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                                  <StatusChip status={hu.status} />
                                                  <span className="text-zinc-500 dark:text-zinc-400">•</span>
                                                  <span className="text-zinc-500 dark:text-zinc-400">
                                                    Fecha límite: {formatDate(hu.dueDate)}
                                                  </span>
                                                  {hu.status === "Completado" && hu.completedAt && (
                                                    <>
                                                      <span className="text-zinc-500 dark:text-zinc-400">•</span>
                                                      <span className="text-zinc-500 dark:text-zinc-400">
                                                        Entregado: {formatDate(hu.completedAt)}
                                                      </span>
                                                    </>
                                                  )}
                                                  {isOverdue && (
                                                    <>
                                                      <span className="text-zinc-500 dark:text-zinc-400">•</span>
                                                      <span className="text-brand-rose font-bold animate-pulse bg-brand-rose/10 px-1 rounded uppercase text-[8px]">¡Vencida!</span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                                                {/* Devoluciones específicas */}
                                                {hu.rejections > 0 && (
                                                  <span className="text-[10px] text-brand-rose bg-brand-rose/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                    {hu.rejections} {hu.rejections === 1 ? 'devolución' : 'devoluciones'}
                                                  </span>
                                                )}

                                                {/* Badge A tiempo/Tarde */}
                                                {hu.status === "Completado" && (
                                                  <OnTimeBadge onTime={hu.onTime} />
                                                )}

                                                {/* Progreso de Criterios de Aceptación */}
                                                {hu.totalCriteria > 0 && (
                                                  <div className="space-y-1">
                                                    <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase text-right">Criterios de Aceptación</p>
                                                    <CriteriaBar 
                                                      pct={hu.progressPct} 
                                                      done={hu.completedCriteria} 
                                                      total={hu.totalCriteria} 
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
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
