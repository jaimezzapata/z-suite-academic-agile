"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCourses } from "../hooks/useCourses";
import { studentService, Student } from "../../shared/services/firebase";
import { FileUp, FileJson, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";

interface StudentImporterProps {
  courseId: string;
  onImportSuccess: () => void;
}

export const StudentImporter: React.FC<StudentImporterProps> = ({ courseId, onImportSuccess }) => {
  const { loading, error, importStudents } = useCourses();
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [showTemplateInfo, setShowTemplateInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStudents = async () => {
    try {
      const list = await studentService.getStudents(courseId);
      setStudents(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [courseId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setSuccessMsg(null);
    const success = await importStudents(file, courseId);
    if (success) {
      setSuccessMsg(`¡Estudiantes importados con éxito desde ${file.name}!`);
      loadStudents();
      onImportSuccess();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Importar Estudiantes (Matrícula)</h3>
          <p className="text-xs text-gray-400">Carga estudiantes masivamente en este curso mediante archivos Excel o JSON.</p>
        </div>
        <button
          onClick={() => setShowTemplateInfo(!showTemplateInfo)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-lg text-xs font-semibold text-gray-300 transition-all cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-brand-purple" />
          Ver Plantilla
        </button>
      </div>

      {showTemplateInfo && (
        <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl space-y-3 glass-panel-light animate-slide-down">
          <p className="text-xs font-semibold text-white">Estructura de Columnas Requerida:</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            El archivo debe contener exactamente las siguientes columnas (Excel) o claves (JSON):
          </p>
          <ul className="text-xs text-gray-400 list-disc pl-5 space-y-1">
            <li><code className="text-brand-purple font-semibold">nombre_completo</code>: Nombre completo del estudiante (Ej: Carlos Gómez)</li>
            <li><code className="text-brand-purple font-semibold">correo_institucional</code>: Email válido de la institución (Ej: cgomez@universidad.edu)</li>
            <li><code className="text-brand-purple font-semibold">codigo_estudiante</code>: Código único de estudiante (Ej: 202610243)</li>
          </ul>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ejemplo JSON:</p>
              <pre className="text-[10px] bg-black/60 p-2.5 rounded-lg border border-white/5 text-brand-purple overflow-x-auto">
{`[
  {
    "nombre_completo": "Ana Torres",
    "correo_institucional": "atorres@univ.edu",
    "codigo_estudiante": "EST101"
  }
]`}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ejemplo Excel:</p>
              <table className="text-[10px] w-full border border-white/5 bg-black/40 rounded-lg text-gray-400 overflow-hidden">
                <thead className="bg-white/5 text-white">
                  <tr>
                    <th className="p-1 border border-white/5 text-left">nombre_completo</th>
                    <th className="p-1 border border-white/5 text-left">correo_institucional</th>
                    <th className="p-1 border border-white/5 text-left">codigo_estudiante</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-1 border border-white/5">Ana Torres</td>
                    <td className="p-1 border border-white/5">atorres@univ.edu</td>
                    <td className="p-1 border border-white/5">EST101</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Zona de Drop File */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
          dragActive
            ? "border-brand-purple bg-brand-purple/5"
            : "border-white/10 hover:border-brand-purple/50 bg-[#090d16]/30 hover:bg-[#090d16]/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center text-brand-purple mb-1">
          <FileUp className="w-6 h-6" />
        </div>

        <div>
          <p className="text-sm font-semibold text-white">
            Arrastra tu archivo aquí o <span className="text-brand-purple">selecciona archivo</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Soporta Excel (.xlsx, .xls) y JSON (.json)</p>
        </div>
      </div>

      {/* Notificaciones */}
      {error && (
        <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Listado de Estudiantes Importados en este Curso */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Estudiantes Inscritos en este Curso ({students.length})
        </h4>

        {students.length === 0 ? (
          <div className="p-6 text-center bg-zinc-900 border border-white/5 rounded-xl text-xs text-gray-500">
            Aún no se han matriculado estudiantes para este curso. Usa la herramienta de carga masiva arriba.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#090d16]/30">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-white/2 text-gray-400 border-b border-white/5 font-semibold">
                  <th className="p-3">Código</th>
                  <th className="p-3">Nombre Completo</th>
                  <th className="p-3">Correo Institucional</th>
                  <th className="p-3">Estado de Proyecto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-white/1 text-gray-300">
                    <td className="p-3 font-semibold text-white">{student.codigo_estudiante}</td>
                    <td className="p-3">{student.nombre_completo}</td>
                    <td className="p-3">{student.correo_institucional}</td>
                    <td className="p-3">
                      {student.projectId ? (
                        <span className="px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/10 rounded-full font-semibold text-[10px]">
                          Asignado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-brand-amber/10 text-brand-amber border border-brand-amber/10 rounded-full font-semibold text-[10px]">
                          Sin Proyecto
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
