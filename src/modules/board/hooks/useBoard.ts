"use client";

import { useState } from "react";
import { boardService, Task, Student, Project } from "../../shared/services/firebase";

export const useBoard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async (projectId: string): Promise<Task[]> => {
    setLoading(true);
    setError(null);
    try {
      const tasks = await boardService.getTasks(projectId);
      return tasks;
    } catch (e: any) {
      setError(e.message || "Error al cargar tareas");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (
    taskData: Omit<Task, "id" | "createdAt" | "feedback_docente">
  ): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const task = await boardService.createTask(taskData);
      
      // Loggear la creación
      if (task) {
        await boardService.createActivityLog({
          courseId: task.courseId,
          projectId: task.projectId,
          task_id: task.id,
          user_id: "sistema",
          user_name: "Sistema",
          previous_status: "Creado",
          new_status: "Backlog",
        });
      }
      return task;
    } catch (e: any) {
      setError(e.message || "Error al crear la tarea");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Lógica transaccional con validaciones de reglas de negocio
  const transitionTask = async (
    task: Task,
    newStatus: Task["status"],
    user: { id: string; name: string; role: "admin" | "docente" | "estudiante" },
    projectMembers: string[],
    feedbackDocente: string | null = null
  ): Promise<boolean> => {
    setError(null);
    const oldStatus = task.status;
    if (oldStatus === newStatus) return true;

    try {
      // 1. REGLA: De "En Revisión" a "Completado" (Solo docente/admin)
      if (newStatus === "Completado" && user.role !== "docente" && user.role !== "admin") {
        throw new Error("Acción denegada: Solo el Docente puede aprobar y mover tarjetas a 'Completado'.");
      }

      // 2. REGLA: Mover a "En Progreso" requiere responsable asignado
      if (newStatus === "En Progreso") {
        if (!task.assignedTo) {
          throw new Error("Acción denegada: No se puede mover a 'En Progreso' sin un integrante asignado.");
        }
        if (!projectMembers.includes(task.assignedTo)) {
          throw new Error("Acción denegada: El estudiante asignado no pertenece a este proyecto.");
        }
      }

      // 3. REGLA: Devolución desde "En Revisión" requiere feedback del Docente
      if (oldStatus === "En Revisión" && (newStatus === "En Progreso" || newStatus === "Backlog")) {
        if (user.role !== "docente" && user.role !== "admin") {
          throw new Error("Acción denegada: Solo el docente puede devolver tarjetas bajo revisión.");
        }
        if (!feedbackDocente || !feedbackDocente.trim()) {
          throw new Error("Acción denegada: Es obligatorio ingresar una retroalimentación para devolver la tarjeta.");
        }
      }

      // Construir updates
      const updates: Partial<Task> = { status: newStatus };
      
      // Registrar marcas de tiempo para métricas de procrastinación y lead time
      if (newStatus === "En Progreso") {
        updates.progressAt = new Date().toISOString();
      } else if (newStatus === "En Revisión") {
        updates.revisionAt = new Date().toISOString();
      } else if (newStatus === "Completado") {
        updates.completedAt = new Date().toISOString();
      }

      // Guardar feedback del docente
      if (feedbackDocente) {
        updates.feedback_docente = feedbackDocente;
      }

      // Actualizar tarjeta en la BD
      await boardService.updateTask(task.id, updates);

      // Crear log de auditoría inmutable
      await boardService.createActivityLog({
        courseId: task.courseId,
        projectId: task.projectId,
        task_id: task.id,
        user_id: user.id,
        user_name: user.name,
        previous_status: oldStatus,
        new_status: newStatus,
      });

      return true;
    } catch (e: any) {
      setError(e.message || "Error al mover la tarjeta");
      return false;
    }
  };

  const updateCardDetails = async (
    task: Task,
    title: string,
    description: string,
    assignedTo: string | null,
    userRole: "admin" | "docente" | "estudiante"
  ): Promise<boolean> => {
    setError(null);
    try {
      // REGLA: En Revisión, congelamiento de alcance. El estudiante no puede editar título/descripción
      if (task.status === "En Revisión" && userRole !== "docente" && userRole !== "admin") {
        if (title !== task.title || description !== task.description) {
          throw new Error("Acción denegada: Título y Descripción congelados durante la revisión del docente.");
        }
      }

      const updates: Partial<Task> = {
        title,
        description,
        assignedTo,
      };

      await boardService.updateTask(task.id, updates);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al actualizar la tarjeta");
      return false;
    }
  };

  const deleteCard = async (taskId: string): Promise<boolean> => {
    setError(null);
    try {
      await boardService.deleteTask(taskId);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al borrar la tarjeta");
      return false;
    }
  };

  return {
    loading,
    error,
    loadTasks,
    createTask,
    transitionTask,
    updateCardDetails,
    deleteCard,
  };
};
