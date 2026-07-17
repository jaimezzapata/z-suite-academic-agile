import { Task, ActivityLog } from "../../shared/services/firebase";

// Métrica I-1: Porcentaje de Participación (P_ind)
export function calculateParticipation(studentId: string, completedTasks: Task[]): number {
  if (completedTasks.length === 0) return 0;
  const studentCompletedCount = completedTasks.filter((t) => t.assignedTo === studentId).length;
  return Math.round((studentCompletedCount / completedTasks.length) * 100);
}

// Métrica I-2: Índice de Procrastinación (IP_ind)
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
    return revisionTime >= windowStart && revisionTime <= deadline;
  }).length;
  return Math.round((procrastinatedCount / studentTasks.length) * 100);
}

// Métrica I-3: Tiempo Promedio en Progreso (TPP_ind)
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
  return Math.round((averageMs / (1000 * 60 * 60)) * 10) / 10;
}

// Métrica G-1: Lead Time Promedio del Proyecto (LT_grupo)
export function calculateLeadTime(completedTasks: Task[]): number {
  if (completedTasks.length === 0) return 0;
  const totalDurationMs = completedTasks.reduce((acc, curr) => {
    const start = new Date(curr.createdAt).getTime();
    const end = new Date(curr.completedAt!).getTime();
    return acc + (end - start);
  }, 0);
  const averageMs = totalDurationMs / completedTasks.length;
  return Math.round((averageMs / (1000 * 60 * 60)) * 10) / 10;
}

// Métrica G-2: Tasa de Rechazo Metodológico (TR_grupo)
export function calculateRejectionRate(logs: ActivityLog[]): number {
  const sentToReviewCount = logs.filter((l) => l.new_status === "En Revisión").length;
  if (sentToReviewCount === 0) return 0;
  const rejectedCount = logs.filter(
    (l) => l.previous_status === "En Revisión" && (l.new_status === "En Progreso" || l.new_status === "Backlog")
  ).length;
  return Math.round((rejectedCount / sentToReviewCount) * 100);
}

// ── NUEVAS MÉTRICAS INDIVIDUALES ─────────────────────────────────────

/**
 * Cuenta devoluciones del docente para las HUs de un estudiante.
 * Una devolución = log donde previous_status === "En Revisión" en una de sus HUs.
 */
export function calculateStudentRejections(huIds: string[], logs: ActivityLog[]): number {
  return logs.filter(
    (l) =>
      huIds.includes(l.task_id) &&
      l.previous_status === "En Revisión" &&
      (l.new_status === "En Progreso" || l.new_status === "Backlog")
  ).length;
}

/**
 * Evalúa si una HU fue entregada a tiempo.
 * @returns true = a tiempo | false = tarde | null = aún no completada
 */
export function checkOnTime(
  completedAt: string | null | undefined,
  dueDate: string | null | undefined
): boolean | null {
  if (!completedAt || !dueDate) return null;
  const due = new Date(dueDate + "T23:59:59").getTime();
  const completed = new Date(completedAt).getTime();
  return completed <= due;
}

/**
 * Avance general del estudiante: % de RFs completados sobre el total
 * de todos sus HUs asignados.
 */
export function calculateOverallProgress(studentHuIds: string[], allTasks: Task[]): number {
  const rfs = allTasks.filter((t) => t.type === "RF" && studentHuIds.includes(t.parentHuId || ""));
  if (rfs.length === 0) return 0;
  const completed = rfs.filter((t) => t.status === "Completado").length;
  return Math.round((completed / rfs.length) * 100);
}
