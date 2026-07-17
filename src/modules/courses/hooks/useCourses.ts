"use client";

import { useState } from "react";
import { courseService, studentService, Student, Course } from "../../shared/services/firebase";
import { parseExcelOrJsonFile } from "../../shared/utils/fileParser";

export const useCourses = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCourse = async (
    name: string,
    sede: string,
    dia: string,
    horario: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<Course | null> => {
    setLoading(true);
    setError(null);
    try {
      const course = await courseService.createCourse(name, sede, dia, horario, fechaInicio, fechaFin);
      return course;
    } catch (e: any) {
      setError(e.message || "Error al crear curso");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (courseId: string, updatedFields: Partial<Course>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await courseService.updateCourse(courseId, updatedFields);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al actualizar curso");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await courseService.deleteCourse(courseId);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al eliminar curso");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateInscriptionsStatus = async (courseId: string, status: "open" | "closed"): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await courseService.updateInscriptionsStatus(courseId, status);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al actualizar estado de inscripciones");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Lógica para analizar y procesar el archivo (JSON o XLSX)
  const processImportFile = async (file: File, courseId: string): Promise<Omit<Student, "role" | "projectId">[]> => {
    const rawRows = await parseExcelOrJsonFile(file);
    return validateAndFormatStudents(rawRows, courseId);
  };

  // Función interna para validar campos obligatorios
  const validateAndFormatStudents = (rows: any[], courseId: string): Omit<Student, "role" | "projectId">[] => {
    return rows.map((row, index) => {
      const nombre = row.nombre_completo || row["nombre Completo"] || row.nombre || row.NombreCompleto;
      const correo = row.correo_electronico || row["Correo Electrónico"] || row.correo_institucional || row.correo || row.email || row.Email;
      const codigo = row.documento_identidad || row["Documento de identidad"] || row.codigo_estudiante || row.codigo || row.code || row.CodigoEstudiante;
      const celular = row.celular || row["Celular"] || row.telefono || row.Telefono || row.phone || row.Phone || "";

      if (!nombre || !correo || !codigo) {
        throw new Error(
          `Fila ${index + 1} inválida. Los campos obligatorios son: 'nombre_completo', 'correo_electronico' y 'documento_identidad'.`
        );
      }

      // Validar formato de correo básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(correo).trim())) {
        throw new Error(`Fila ${index + 1} inválida. El correo '${correo}' no tiene un formato válido.`);
      }

      return {
        id: String(codigo).trim(),
        nombre_completo: String(nombre).trim(),
        correo_institucional: String(correo).trim().toLowerCase(),
        codigo_estudiante: String(codigo).trim(),
        telefono: String(celular).trim(),
        courseId,
      };
    });
  };

  const importStudents = async (file: File, courseId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const studentsToImport = await processImportFile(file, courseId);
      if (studentsToImport.length === 0) {
        throw new Error("El archivo no contiene registros de estudiantes válidos.");
      }
      await studentService.importStudents(studentsToImport);
      return true;
    } catch (e: any) {
      setError(e.message || "Error al importar estudiantes");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    updateInscriptionsStatus,
    importStudents,
  };
};
