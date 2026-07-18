"use client";

import { useState, useEffect } from "react";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../../../../sdk-firebase";
import {
  studentService,
  projectService,
  Student,
  Project,
  Task,
  ActivityLog,
  TimeReport
} from "../../shared/services/firebase";
import {
  calculateParticipation,
  calculateProcrastinationIndex,
  calculateAverageTimeInProgress,
  calculateLeadTime,
  calculateRejectionRate,
  calculateStudentRejections,
  checkOnTime,
  calculateOverallProgress,
} from "../utils/metrics";

/** Detalle de avance de una HU específica asignada al estudiante */
export interface HUProgress {
  huId: string;
  title: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  totalCriteria: number;
  completedCriteria: number;
  progressPct: number;
  /** true = entregó a tiempo | false = tarde | null = pendiente */
  onTime: boolean | null;
  /** Número de veces que esta HU fue devuelta por el docente */
  rejections: number;
}

export interface StudentAnalytics {
  studentId: string;
  name: string;
  code: string;
  // Métricas clásicas
  participation: number;
  procrastination: number;
  avgTimeInProgress: number;
  tasksCompletedCount: number;
  // Nuevas métricas
  assignedHUs: number;
  overallProgress: number;
  onTimeCount: number;
  lateCount: number;
  totalRejections: number;
  huDetails: HUProgress[];
  symbolicGrade: number;
  gradeMessage: string;
  timeReports: TimeReport[];
  totalTimeSpentMinutes: number;
}

export interface GroupAnalytics {
  leadTime: number; // LT_grupo
  rejectionRate: number; // TR_grupo
  completedCount: number;
  totalCount: number;
  studentsAnalytics: StudentAnalytics[];
  totalGroupTimeSpentMinutes: number;
}

export const useAnalytics = (courseId: string, projectId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);

  useEffect(() => {
    if (!projectId) {
      setAnalytics(null);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribeTasks: () => void = () => {};
    let unsubscribeLogs: () => void = () => {};
    let unsubscribeTimeReports: () => void = () => {};
    let active = true;

    const setupListeners = async () => {
      try {
        // Cargar datos estáticos (estudiantes y proyectos) una sola vez
        const [allStudents, allProjects] = await Promise.all([
          studentService.getStudents(courseId),
          projectService.getProjects(courseId),
        ]);

        if (!active) return;

        const project = allProjects.find((p) => p.id === projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        const projectStudents = allStudents.filter((s) => project.members.includes(s.id));

        let currentTasks: Task[] = [];
        let currentLogs: ActivityLog[] = [];
        let currentTimeReports: TimeReport[] = [];

        const runCalculation = () => {
          if (!active) return;

          // Filtrar tareas que están activas en el tablero (las HUs activas y sus respectivos RFs)
          const activeHUs = currentTasks.filter((t) => t.type === "HU" && t.inKanban !== false);
          const activeHuIds = activeHUs.map((h) => h.id);
          const activeRFs = currentTasks.filter(
            (t) => t.type === "RF" && t.parentHuId && activeHuIds.includes(t.parentHuId)
          );

          // Todas las tareas activas para evaluar métricas
          const projectTasks = [...activeHUs, ...activeRFs];
          const completedTasks = projectTasks.filter((t) => t.status === "Completado");

          // Métricas grupales
          const leadTime = calculateLeadTime(completedTasks);
          const rejectionRate = calculateRejectionRate(currentLogs);

          const studentsAnalytics: StudentAnalytics[] = projectStudents.map((student) => {
            // HUs asignadas al estudiante (ya sea directamente a la HU, o a alguno de sus RFs)
            const studentHUs = activeHUs.filter(
              (hu) =>
                hu.assignedTo === student.id ||
                activeRFs.some((rf) => rf.parentHuId === hu.id && rf.assignedTo === student.id)
            );
            const studentHuIds = studentHUs.map((hu) => hu.id);

            // Detalle por HU
            const huDetails: HUProgress[] = studentHUs.map((hu) => {
              const rfs = activeRFs.filter((t) => t.parentHuId === hu.id);
              const completedRfs = rfs.filter((t) => t.status === "Completado").length;
              const progressPct = rfs.length > 0 ? Math.round((completedRfs / rfs.length) * 100) : 0;
              const huRejections = calculateStudentRejections([hu.id], currentLogs);
              const onTime = checkOnTime(hu.completedAt, hu.dueDate);

              return {
                huId: hu.id,
                title: hu.title,
                status: hu.status,
                dueDate: hu.dueDate || null,
                completedAt: hu.completedAt || null,
                totalCriteria: rfs.length,
                completedCriteria: completedRfs,
                progressPct,
                onTime,
                rejections: huRejections,
              };
            });

            const onTimeCount = huDetails.filter((h) => h.onTime === true).length;
            const lateCount = huDetails.filter((h) => h.onTime === false).length;
            const totalRejections = calculateStudentRejections(studentHuIds, currentLogs);
            const overallProgress = calculateOverallProgress(studentHuIds, projectTasks);
            const studentCompleted = completedTasks.filter((t) => t.assignedTo === student.id);

            // Tiempos reportados por el estudiante
            const studentTimeReports = currentTimeReports.filter((tr) => tr.studentId === student.id);
            const totalTimeSpentMinutes = studentTimeReports.reduce((acc, tr) => acc + tr.timeSpentMinutes, 0);

            // Cálculo de Nota Simbólica
            let symbolicGrade = 0;
            if (studentHUs.length > 0 || studentCompleted.length > 0) {
              // Base basada en el progreso general (0 a 5)
              let base = (overallProgress / 100) * 5.0;
              // Penalizaciones
              base -= (lateCount * 0.5); // -0.5 por entrega tarde
              base -= (totalRejections * 0.2); // -0.2 por cada devolución
              symbolicGrade = Math.max(0, Math.min(5, base));
            }
            
            // Redondear a 1 decimal
            symbolicGrade = Math.round(symbolicGrade * 10) / 10;
            
            let gradeMessage = "Va mal";
            if (symbolicGrade >= 4.0) gradeMessage = "Va excelente";
            else if (symbolicGrade >= 3.0) gradeMessage = "Va bien";

            return {
              studentId: student.id,
              name: student.nombre_completo,
              code: student.codigo_estudiante,
              participation: calculateParticipation(student.id, completedTasks),
              procrastination: calculateProcrastinationIndex(student.id, projectTasks, project.deadline),
              avgTimeInProgress: calculateAverageTimeInProgress(student.id, projectTasks),
              tasksCompletedCount: studentCompleted.length,
              assignedHUs: studentHUs.length,
              overallProgress,
              onTimeCount,
              lateCount,
              totalRejections,
              huDetails,
              symbolicGrade,
              gradeMessage,
              timeReports: studentTimeReports,
              totalTimeSpentMinutes,
            };
          });

          const totalGroupTimeSpentMinutes = studentsAnalytics.reduce((acc, s) => acc + s.totalTimeSpentMinutes, 0);

          setAnalytics({
            leadTime,
            rejectionRate,
            completedCount: activeHUs.filter((t) => t.status === "Completado").length,
            totalCount: activeHUs.length,
            studentsAnalytics,
            totalGroupTimeSpentMinutes,
          });
          setLoading(false);
        };

        // Escuchar cambios en tareas en tiempo real
        const qTasks = query(collection(db, "tasks"), where("projectId", "==", projectId));
        unsubscribeTasks = onSnapshot(
          qTasks,
          (snapshot) => {
            currentTasks = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Task[];
            runCalculation();
          },
          (err) => {
            console.error("Error en tareas onSnapshot:", err);
            setError("Error al suscribirse a las tareas en tiempo real.");
          }
        );

        // Escuchar cambios en logs en tiempo real
        const qLogs = query(
          collection(db, "activity_logs"),
          where("courseId", "==", courseId),
          where("projectId", "==", projectId)
        );
        unsubscribeLogs = onSnapshot(
          qLogs,
          (snapshot) => {
            const logs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as ActivityLog[];
            currentLogs = [...logs].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            runCalculation();
          },
          (err) => {
            console.error("Error en logs onSnapshot:", err);
            setError("Error al suscribirse a logs de actividad en tiempo real.");
          }
        );

        // Escuchar reportes de tiempo
        const qTimeReports = query(
          collection(db, "time_reports"),
          where("projectId", "==", projectId)
        );
        unsubscribeTimeReports = onSnapshot(
          qTimeReports,
          (snapshot) => {
            const tr = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as TimeReport[];
            currentTimeReports = [...tr].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            runCalculation();
          },
          (err) => {
            console.error("Error en time_reports onSnapshot:", err);
            setError("Error al suscribirse a reportes de tiempo.");
          }
        );

      } catch (err: any) {
        if (active) {
          setError(err.message || "Error al inicializar suscripciones.");
          setLoading(false);
        }
      }
    };

    setupListeners();

    return () => {
      active = false;
      unsubscribeTasks();
      unsubscribeLogs();
      unsubscribeTimeReports();
    };
  }, [courseId, projectId]);

  return {
    loading,
    error,
    analytics,
    refreshAnalytics: () => {},
  };
};
