"use client";

import { useState } from "react";
import { projectService, Project, studentService } from "../../shared/services/firebase";

export const useProjects = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (courseId: string, name: string, maxMembers = 4): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    try {
      const project = await projectService.createProject(courseId, name, maxMembers);
      return project;
    } catch (e: any) {
      setError(e.message || "Error al crear proyecto");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateMaxMembers = async (projectId: string, maxMembers: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (maxMembers < 1) throw new Error("La capacidad máxima debe ser de al menos 1 integrante.");
      await projectService.updateProjectMaxMembers(projectId, maxMembers);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al actualizar la capacidad máxima");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateDeadline = async (projectId: string, deadline: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await projectService.updateProjectDeadline(projectId, deadline);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al actualizar la fecha de entrega");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const joinProject = async (studentId: string, projectId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await projectService.joinProject(studentId, projectId);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al unirse al proyecto.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const moveStudent = async (studentId: string, targetProjectId: string | null, sourceProjectId: string | null): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await projectService.moveStudentToProject(studentId, targetProjectId, sourceProjectId);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al reubicar al estudiante");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createProject,
    updateMaxMembers,
    updateDeadline,
    joinProject,
    moveStudent,
  };
};
