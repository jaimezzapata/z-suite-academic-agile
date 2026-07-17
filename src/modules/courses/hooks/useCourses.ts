"use client";

import { useState } from "react";
import { courseService, studentService, Student, Course } from "../../shared/services/firebase";
import * as XLSX from "xlsx";

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
  const processImportFile = (file: File, courseId: string): Promise<Omit<Student, "role" | "projectId">[]> => {
    return new Promise((resolve, reject) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const reader = new FileReader();

      if (extension === "json") {
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target?.result as string);
            const array = Array.isArray(json) ? json : [json];
            
            // Validaciones y normalización
            const students = validateAndFormatStudents(array, courseId);
            resolve(students);
          } catch (err: any) {
            reject(new Error("Error al analizar archivo JSON: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Error al leer el archivo JSON"));
        reader.readAsText(file);
      } else if (extension === "xlsx" || extension === "xls") {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet);
            
            // Validaciones y normalización
            const students = validateAndFormatStudents(rawRows, courseId);
            resolve(students);
          } catch (err: any) {
            reject(new Error("Error al analizar archivo Excel: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Error al leer el archivo Excel"));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error("Formato de archivo no soportado. Suba un archivo .json o .xlsx"));
      }
    });
  };

  // Función interna para validar campos obligatorios
  const validateAndFormatStudents = (rows: any[], courseId: string): Omit<Student, "role" | "projectId">[] => {
    return rows.map((row, index) => {
      const nombre = row.nombre_completo || row.nombre || row.NombreCompleto;
      const correo = row.correo_institucional || row.correo || row.email || row.Email;
      const codigo = row.codigo_estudiante || row.codigo || row.code || row.CodigoEstudiante;

      if (!nombre || !correo || !codigo) {
        throw new Error(
          `Fila ${index + 1} inválida. Los campos obligatorios son: nombre_completo, correo_institucional, codigo_estudiante.`
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
