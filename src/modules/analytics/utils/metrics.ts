import { Task, ActivityLog } from "../../shared/services/firebase";

// Métrica I-1: Porcentaje de Participación (P_ind)
export function calculateParticipation(studentId: string, completedTasks: Task[]): number {
  if (completedTasks.length === 0) return 0;
  const studentCompletedCount = completedTasks.filter((t) => t.assignedTo === studentId).length;
  return Math.round((studentCompletedCount / completedTasks.length) * 100);
}

// Métrica I-2: Índice de Procrastinación (IP_ind)
// IP_ind = (Tareas movidas a "En Revisión" en las últimas 48h previas a T_entrega / Total de tareas en revisión) * 100
export function calculateProcrastinationIndex(
  studentId: string,
  tasks: Task[],
  deadlineStr?: string
): number {
  if (!deadlineStr) return 0;
  
  const deadline = new Date(deadlineStr).getTime();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const windowStart = deadline - fortyEightHoursMs;

  const studentTasks = tasks.filter((t) => t.assignedTo === studentId && t.revisionAt);
  if (studentTasks.length === 0) return 0;

  const procrastinatedCount = studentTasks.filter((t) => {
    if (!t.revisionAt) return false;
    const revisionTime = new Date(t.revisionAt).getTime();
    // ¿Ocurrió en las últimas 48h antes de la entrega?
    return revisionTime >= windowStart && revisionTime <= deadline;
  }).length;

  return Math.round((procrastinatedCount / studentTasks.length) * 100);
}

// Métrica I-3: Tiempo Promedio en Progreso (TPP_ind)
// TPP_ind = Sum(T_revisión - T_progreso) / k (en horas)
export function calculateAverageTimeInProgress(studentId: string, tasks: Task[]): number {
  const studentTasks = tasks.filter(
    (t) => t.assignedTo === studentId && t.progressAt && t.revisionAt
  );
  if (studentTasks.length === 0) return 0;

  const totalDurationMs = studentTasks.reduce((acc, curr) => {
    const start = new Date(curr.progressAt!).getTime();
    const end = new Date(curr.revisionAt!).getTime();
    return acc + (end - start);
  }, 0);

  const averageMs = totalDurationMs / studentTasks.length;
  // Convertir a horas con 1 decimal
  return Math.round((averageMs / (1000 * 60 * 60)) * 10) / 10;
}

// Métrica G-1: Lead Time Promedio del Proyecto (LT_grupo)
// LT_grupo = Sum(T_completado - T_creacion) / n (en horas)
export function calculateLeadTime(completedTasks: Task[]): number {
  if (completedTasks.length === 0) return 0;

  const totalDurationMs = completedTasks.reduce((acc, curr) => {
    const start = new Date(curr.createdAt).getTime();
    const end = new Date(curr.completedAt!).getTime();
    return acc + (end - start);
  }, 0);

  const averageMs = totalDurationMs / completedTasks.length;
  // Convertir a horas con 1 decimal
  return Math.round((averageMs / (1000 * 60 * 60)) * 10) / 10;
}

// Métrica G-2: Tasa de Rechazo Metodológico (TR_grupo)
// TR_grupo = Cantidad de rechazos / Total enviado a En Revisión
export function calculateRejectionRate(logs: ActivityLog[]): number {
  // Total de veces que una tarjeta se movió A "En Revisión"
  const sentToReviewCount = logs.filter((l) => l.new_status === "En Revisión").length;
  if (sentToReviewCount === 0) return 0;

  // Veces devueltas de "En Revisión" hacia "En Progreso" o "Backlog"
  const rejectedCount = logs.filter(
    (l) => l.previous_status === "En Revisión" && (l.new_status === "En Progreso" || l.new_status === "Backlog")
  ).length;

  return Math.round((rejectedCount / sentToReviewCount) * 100);
}
