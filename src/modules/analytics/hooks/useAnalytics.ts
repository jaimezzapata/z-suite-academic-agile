"use client";

import { useState, useEffect } from "react";
import {
  studentService,
  projectService,
  boardService,
  Student,
  Project,
  Task,
  ActivityLog
} from "../../shared/services/firebase";
import {
  calculateParticipation,
  calculateProcrastinationIndex,
  calculateAverageTimeInProgress,
  calculateLeadTime,
  calculateRejectionRate
} from "../utils/metrics";

export interface StudentAnalytics {
  studentId: string;
  name: string;
  code: string;
  participation: number; // P_ind
  procrastination: number; // IP_ind
  avgTimeInProgress: number; // TPP_ind
  tasksCompletedCount: number;
}

export interface GroupAnalytics {
  leadTime: number; // LT_grupo
  rejectionRate: number; // TR_grupo
  completedCount: number;
  totalCount: number;
  studentsAnalytics: StudentAnalytics[];
}

export const useAnalytics = (courseId: string, projectId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);

  const calculateAnalytics = async () => {
    if (!projectId) {
      setAnalytics(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [allStudents, allProjects, allTasks, allLogs] = await Promise.all([
        studentService.getStudents(courseId),
        projectService.getProjects(courseId),
        boardService.getTasks(projectId),
        boardService.getActivityLogs(courseId, projectId),
      ]);

      const project = allProjects.find((p) => p.id === projectId);
      if (!project) throw new Error("Proyecto no encontrado");

      // Filtrar tareas completadas
      const completedTasks = allTasks.filter((t) => t.status === "Completado");

      // Filtrar estudiantes de este proyecto
      const projectStudents = allStudents.filter((s) => project.members.includes(s.id));

      // Métricas grupales
      const leadTime = calculateLeadTime(completedTasks);
      const rejectionRate = calculateRejectionRate(allLogs);

      // Métricas individuales por estudiante
      const studentsAnalytics: StudentAnalytics[] = projectStudents.map((student) => {
        const studentCompleted = completedTasks.filter((t) => t.assignedTo === student.id);
        
        return {
          studentId: student.id,
          name: student.nombre_completo,
          code: student.codigo_estudiante,
          participation: calculateParticipation(student.id, completedTasks),
          procrastination: calculateProcrastinationIndex(student.id, allTasks, project.deadline),
          avgTimeInProgress: calculateAverageTimeInProgress(student.id, allTasks),
          tasksCompletedCount: studentCompleted.length,
        };
      });

      setAnalytics({
        leadTime,
        rejectionRate,
        completedCount: completedTasks.length,
        totalCount: allTasks.length,
        studentsAnalytics,
      });
    } catch (e: any) {
      setError(e.message || "Error al calcular analíticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateAnalytics();
  }, [courseId, projectId]);

  return {
    loading,
    error,
    analytics,
    refreshAnalytics: calculateAnalytics,
  };
};
