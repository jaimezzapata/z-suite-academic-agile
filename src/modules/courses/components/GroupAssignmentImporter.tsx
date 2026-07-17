"use client";

import React, { useState, useRef } from "react";
import { useProjects } from "../../projects/hooks/useProjects";
import { FileUp, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface GroupAssignmentImporterProps {
  courseId: string;
  onImportSuccess: () => void;
}

export const GroupAssignmentImporter: React.FC<GroupAssignmentImporterProps> = ({ courseId, onImportSuccess }) => {
  const { importGroupAssignments, loading, error } = useProjects();
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showTemplateInfo, setShowTemplateInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const success = await importGroupAssignments(file, courseId);
      if (success) {
        toast.success(`¡Asignaciones de grupo cargadas con éxito desde ${file.name}!`);
        setSuccessMsg(`¡Asignaciones de grupo cargadas con éxito desde ${file.name}!`);
        onImportSuccess();
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error("Error al importar asignaciones de grupo.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al importar archivo de asignación.");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">Importar Asignaciones de Grupos</h3>
          <p className="text-xs text-zinc-550 dark:text-zinc-400">Asigne estudiantes a grupos de trabajo de forma masiva mediante archivos Excel o JSON.</p>
        </div>
        <button
          onClick={() => setShowTemplateInfo(!showTemplateInfo)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-650 dark:text-zinc-300 transition-all cursor-pointer shadow-xs"
        >
          <HelpCircle className="w-4 h-4 text-brand-purple" />
          Ver Plantilla
        </button>
      </div>

      {showTemplateInfo && (
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3 shadow-xs animate-slide-down">
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">Estructura de Columnas Requerida:</p>
          <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
            El archivo de asignación de grupos debe contener las siguientes columnas (Excel) o claves (JSON):
          </p>
          <ul className="text-xs text-zinc-650 dark:text-zinc-400 list-disc pl-5 space-y-1">
            <li><code className="text-brand-purple font-semibold">documento_identidad</code>: Identificación o código único del estudiante matriculado (Ej: 102638210)</li>
            <li><code className="text-brand-purple font-semibold">nombre_grupo</code>: Nombre del grupo al que se asignará (Ej: Grupo A). Si el grupo no existe, se creará automáticamente.</li>
            <li><code className="text-brand-purple font-semibold">limite_integrantes</code> (Opcional): Capacidad máxima de miembros del grupo (Ej: 5). Por defecto es 5 si se crea el grupo.</li>
          </ul>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Ejemplo JSON:</p>
              <pre className="text-[10px] bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-brand-purple overflow-x-auto shadow-xs">
{`[
  {
    "documento_identidad": "102638210",
    "nombre_grupo": "Grupo de Trabajo A",
    "limite_integrantes": 4
  },
  {
    "documento_identidad": "202610992",
    "nombre_grupo": "Grupo de Trabajo A",
    "limite_integrantes": 4
  }
]`}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Ejemplo Excel:</p>
              <table className="text-[10px] w-full border border-zinc-800 bg-zinc-950 rounded-lg text-zinc-650 dark:text-zinc-400 overflow-hidden shadow-xs">
                <thead className="bg-zinc-900/50 text-zinc-850 dark:text-zinc-100">
                  <tr>
                    <th className="p-1 border border-zinc-800 text-left">documento_identidad</th>
                    <th className="p-1 border border-zinc-800 text-left">nombre_grupo</th>
                    <th className="p-1 border border-zinc-800 text-left">limite_integrantes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-800 last:border-0">
                    <td className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-700 dark:text-zinc-300">102638210</td>
                    <td className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-700 dark:text-zinc-300">Grupo de Trabajo A</td>
                    <td className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-700 dark:text-zinc-300">4</td>
                  </tr>
                  <tr className="border-b border-zinc-800 last:border-0">
                    <td className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-700 dark:text-zinc-300">202610992</td>
                    <td className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-700 dark:text-zinc-300">Grupo de Trabajo A</td>
                    <td className="p-1 border border-zinc-800 bg-zinc-950 text-zinc-700 dark:text-zinc-300">4</td>
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
            : "border-zinc-800 hover:border-brand-purple/50 bg-zinc-950 hover:bg-zinc-900 shadow-xs"
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
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {loading ? "Procesando archivo..." : "Arrastra tu archivo aquí o"} <span className="text-brand-purple">selecciona archivo</span>
          </p>
          <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">Soporta Excel (.xlsx, .xls) y JSON (.json)</p>
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
    </div>
  );
};
