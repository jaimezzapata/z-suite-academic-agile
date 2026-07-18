"use client";

import { useState } from "react";
import { projectService, Project, studentService, db } from "../../shared/services/firebase";
import { writeBatch, doc } from "firebase/firestore";
import { parseExcelOrJsonFile } from "../../shared/utils/fileParser";

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

  const importGroupAssignments = async (file: File, courseId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await parseExcelOrJsonFile(file);

      if (rows.length === 0) {
        throw new Error("El archivo no contiene registros válidos.");
      }

      // Validar y normalizar
      // Columnas esperadas: documento_identidad, nombre_grupo, limite_integrantes (opcional)
      const normalizedRows = rows.map((row, index) => {
        const docId = row.documento_identidad || row["documento de identidad"] || row.documento || row.codigo_estudiante || row.codigo || row.code;
        const groupName = row.nombre_grupo || row["nombre del grupo"] || row.grupo || row.proyecto || row.nombre_proyecto || row["nombre_grupo"];
        const maxMembers = row.limite_integrantes || row["limite de integrantes"] || row.limite || row.max_integrantes || row.capacidad || null;

        if (!docId || !groupName) {
          throw new Error(`Fila ${index + 1} inválida. Se requiere 'documento_identidad' y 'nombre_grupo'.`);
        }

        return {
          documento_identidad: String(docId).trim(),
          nombre_grupo: String(groupName).trim(),
          limite_integrantes: maxMembers ? Number(maxMembers) : 5,
        };
      });

      // Obtener estudiantes y proyectos del curso
      const allStudents = await studentService.getStudents(courseId);
      const allProjects = await projectService.getProjects(courseId);

      const batch = writeBatch(db);

      // Mapeo de proyectos locales para no duplicar creación si se define el mismo grupo varias veces en el archivo
      const localProjectsMap = new Map<string, Project>();
      allProjects.forEach(p => localProjectsMap.set(p.name.toLowerCase(), p));

      // Mapeo de estudiantes actuales para saber su proyecto origen y su ID
      const studentsMap = new Map<string, typeof allStudents[0]>();
      allStudents.forEach(s => studentsMap.set(s.codigo_estudiante, s));

      // Agrupamos estudiantes que se van a agregar a cada proyecto para validar capacidad y construir la lista final de miembros
      // project_id -> list of student_ids
      const projectMembersToAdd = new Map<string, string[]>();

      // Track students already processed in this file
      const processedStudents = new Set<string>();

      for (const row of normalizedRows) {
        const student = studentsMap.get(row.documento_identidad);
        if (!student) {
          throw new Error(`No se encontró el estudiante con documento/código '${row.documento_identidad}' en este curso.`);
        }
        if (processedStudents.has(student.id)) {
          throw new Error(`El estudiante con documento '${row.documento_identidad}' aparece duplicado en el archivo.`);
        }
        processedStudents.add(student.id);

        // Buscar o crear proyecto
        const nameLower = row.nombre_grupo.toLowerCase();
        let targetProj = localProjectsMap.get(nameLower);
        
        if (!targetProj) {
          // Si el proyecto no existe localmente, lo definimos
          const newProjId = Math.random().toString(36).substring(2, 11);
          targetProj = {
            id: newProjId,
            courseId,
            name: row.nombre_grupo,
            max_members: row.limite_integrantes,
            members: [],
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          };
          localProjectsMap.set(nameLower, targetProj);
          
          // Escribir en el batch la creación del nuevo proyecto
          const newProjRef = doc(db, "projects", newProjId);
          batch.set(newProjRef, targetProj);
        }

        // Si el estudiante ya estaba en un grupo y no es el mismo grupo destino,
        // entonces lo ignoramos (saltamos) para que no se reasigne y no bloquee a los demás.
        if (student.projectId && student.projectId !== targetProj.id) {
          continue;
        }

        // Agregar estudiante a la lista de adición para este proyecto
        const toAdd = projectMembersToAdd.get(targetProj.id) || [];
        toAdd.push(student.id);
        projectMembersToAdd.set(targetProj.id, toAdd);
      }

      // Procesar asignaciones finales y validar límites
      for (const [projId, studentIds] of projectMembersToAdd.entries()) {
        const targetProj = Array.from(localProjectsMap.values()).find(p => p.id === projId);
        if (!targetProj) continue;

        // Nuevos miembros que no estaban ya en el grupo
        const currentMembers = targetProj.members;
        const newMembersList = [...currentMembers];
        
        studentIds.forEach(id => {
          if (!newMembersList.includes(id)) {
            newMembersList.push(id);
          }
        });

        if (newMembersList.length > targetProj.max_members) {
          throw new Error(`El grupo '${targetProj.name}' supera el límite de integrantes (${targetProj.max_members}). Intentas asignar ${newMembersList.length} estudiantes.`);
        }

        targetProj.members = newMembersList;
        const targetProjRef = doc(db, "projects", targetProj.id);
        batch.update(targetProjRef, { members: targetProj.members });

        // Actualizar el projectId de cada estudiante asignado en Firestore
        studentIds.forEach(studentId => {
          const studentRef = doc(db, "students", studentId);
          batch.update(studentRef, { projectId: targetProj.id });
        });
      }

      await batch.commit();
      return true;
    } catch (e: any) {
      setError(e.message || "Error al importar asignaciones");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const importProjects = async (file: File, courseId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const rows = await parseExcelOrJsonFile(file);

      if (rows.length === 0) {
        throw new Error("El archivo no contiene registros válidos.");
      }

      // Validar y normalizar
      // Columnas esperadas: nombre_grupo, limite_integrantes, fecha_entrega (opcional)
      const normalizedRows = rows.map((row, index) => {
        const name = row.nombre_grupo || row.nombre || row.proyecto || row.nombre_proyecto;
        const maxMembers = row.limite_integrantes || row["limite de integrantes"] || row.limite || row.max_integrantes || row.capacidad || null;
        const deadline = row.fecha_entrega || row.fecha_limite || row.deadline || null;

        if (!name) {
          throw new Error(`Fila ${index + 1} inválida. Se requiere 'nombre_grupo'.`);
        }

        return {
          name: String(name).trim(),
          maxMembers: maxMembers ? Number(maxMembers) : 4,
          deadline: deadline ? String(deadline).trim() : null,
        };
      });

      // Obtener proyectos existentes para evitar duplicar nombres
      const existingProjects = await projectService.getProjects(courseId);
      const existingNames = new Set(existingProjects.map(p => p.name.toLowerCase()));

      const batch = writeBatch(db);

      normalizedRows.forEach((row) => {
        const nameLower = row.name.toLowerCase();
        if (existingNames.has(nameLower)) {
          // Si el grupo ya existe, omitir
          return;
        }
        existingNames.add(nameLower);

        const newProjId = Math.random().toString(36).substring(2, 11);
        const deadlineDate = row.deadline 
          ? new Date(row.deadline).toISOString() 
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

        const newProject: Project = {
          id: newProjId,
          courseId,
          name: row.name,
          max_members: row.maxMembers,
          members: [],
          deadline: deadlineDate,
        };

        const newProjRef = doc(db, "projects", newProjId);
        batch.set(newProjRef, newProject);
      });

      await batch.commit();
      return true;
    } catch (e: any) {
      setError(e.message || "Error al importar proyectos");
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
    importGroupAssignments,
    importProjects,
  };
};
