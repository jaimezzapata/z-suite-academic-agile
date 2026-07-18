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
  Trash2,
} from "lucide-react";
import { DonutChart } from "./DonutChart";
import { StatusChip, OnTimeBadge, CriteriaBar, formatDate } from "./AnalyticsHelpers";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { boardService } from "../../shared/services/firebase";

export const AnalyticsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedCourse, selectedProjectId, setSelectedProjectId } = useDashboard();
  const { analytics, loading, error } = useAnalytics(
    selectedCourse?.id || "",
    selectedProjectId
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [isWiping, setIsWiping] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

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

  // Renderizar Donut Chart SVG
  const renderDonutChart = () => {
    if (!analytics) return null;
    return <DonutChart studentsAnalytics={analytics.studentsAnalytics} />;
  };

  // Cálculo de Cumplimiento de Fechas Grupal
  const groupOnTime = analytics ? analytics.studentsAnalytics.reduce((acc, s) => acc + s.onTimeCount, 0) : 0;
  const groupLate = analytics ? analytics.studentsAnalytics.reduce((acc, s) => acc + s.lateCount, 0) : 0;
  const totalCompletedHUs = groupOnTime + groupLate;
  const complianceRate = totalCompletedHUs > 0 ? Math.round((groupOnTime / totalCompletedHUs) * 100) : 0;

  const handleWipeMetrics = async () => {
    if (!selectedProjectId) return;
    setIsWiping(true);
    try {
      await boardService.wipeProjectTasksAndMetrics(selectedProjectId);
      // Forzar recarga o actualización recargando la página o emitiendo un evento
      window.location.reload();
    } catch (e) {
      console.error("Error al limpiar métricas:", e);
      setIsWiping(false);
      setShowWipeConfirm(false);
    }
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
          <div className="flex items-center gap-2">
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
            {selectedProjectId && (
              <button
                onClick={() => setShowWipeConfirm(true)}
                className="flex items-center justify-center p-2 bg-brand-rose/10 text-brand-rose hover:bg-brand-rose hover:text-white rounded-xl transition-colors cursor-pointer border border-brand-rose/20"
                title="Limpiar todas las métricas y tareas del proyecto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showWipeConfirm}
        title="Limpiar Métricas y Tareas"
        message="¿Estás seguro de que deseas eliminar por completo TODAS las tareas (HU y RF) y el historial de métricas de este proyecto? Esta acción dejará el proyecto en blanco y no se puede deshacer."
        confirmText={isWiping ? "Limpiando..." : "Sí, Limpiar Proyecto"}
        cancelText="Cancelar"
        onConfirm={handleWipeMetrics}
        onCancel={() => !isWiping && setShowWipeConfirm(false)}
        isDanger={true}
      />

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

            {/* Tiempo Total Invertido */}
            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 relative overflow-hidden shadow-xs">
              <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Tiempo Invertido Grupal</p>
              <h3 className="text-2xl font-black pt-1 text-zinc-800 dark:text-zinc-100">
                {Math.floor((analytics.totalGroupTimeSpentMinutes || 0) / 60)}h {(analytics.totalGroupTimeSpentMinutes || 0) % 60}m
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Tiempo total acumulado reportado por todos los integrantes del grupo durante el proyecto.
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
                      <th className="p-3 text-center">Tareas Completadas</th>
                      <th className="p-3 text-center">Participación</th>
                      <th className="p-3 text-center">Nota Simbólica</th>
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
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <span className={`text-sm font-black ${
                                  student.symbolicGrade >= 4.0 ? 'text-brand-emerald' :
                                  student.symbolicGrade >= 3.0 ? 'text-brand-blue' :
                                  'text-brand-rose'
                                }`}>
                                  {student.symbolicGrade.toFixed(1)}
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">
                                  {student.gradeMessage}
                                </span>
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

                                  {/* Listado de Tiempos Reportados */}
                                  <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-brand-blue" />
                                        Tiempos Reportados ({Math.floor(student.totalTimeSpentMinutes / 60)}h {student.totalTimeSpentMinutes % 60}m)
                                      </p>
                                    </div>
                                    {(!student.timeReports || student.timeReports.length === 0) ? (
                                      <p className="text-xs text-zinc-500 italic p-2">Este estudiante no ha reportado tiempos en este proyecto.</p>
                                    ) : (
                                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                        {student.timeReports.map((tr) => (
                                          <div key={tr.id} className="p-3 bg-zinc-950 border border-zinc-800 shadow-sm rounded-xl flex flex-col gap-2 text-xs hover:border-zinc-700 transition-colors">
                                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                              <span className="font-bold text-zinc-300">
                                                {Math.floor(tr.timeSpentMinutes / 60)}h {tr.timeSpentMinutes % 60}m
                                              </span>
                                              <span className="text-[10px] text-zinc-500">{formatDate(tr.timestamp)}</span>
                                            </div>
                                            <p className="text-zinc-400 italic">"{tr.observation}"</p>
                                          </div>
                                        ))}
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
