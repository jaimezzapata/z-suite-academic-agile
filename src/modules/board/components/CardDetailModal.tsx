"use client";

import React, { useState, useEffect } from "react";
import { Task, boardService, ActivityLog, studentService, Student } from "../../shared/services/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { AlertCircle, History, User, FileText, CheckSquare, Trash2, Check, Clock } from "lucide-react";

interface CardDetailModalProps {
  isOpen: boolean;
  task: Task | null; // Null indica creación de nueva tarjeta
  projectId: string;
  courseId: string;
  projectMembers: string[];
  onClose: () => void;
  onSave: (taskData: {
    type: "HU" | "RF";
    title: string;
    description: string;
    assignedTo: string | null;
  }) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  isOpen,
  task,
  projectId,
  courseId,
  projectMembers,
  onClose,
  onSave,
  onDelete,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  
  // Estados de los campos
  const [type, setType] = useState<"HU" | "RF">("HU");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  
  const [teamMembers, setTeamMembers] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeamAndLogs = async () => {
      try {
        // Cargar nombres de integrantes del equipo
        const studentsList = await studentService.getStudents(courseId);
        const filtered = studentsList.filter((s) => projectMembers.includes(s.id));
        setTeamMembers(filtered);

        // Cargar logs si estamos editando
        if (task) {
          const activityLogs = await boardService.getActivityLogs(courseId, projectId);
          const taskLogs = activityLogs.filter((l) => l.task_id === task.id);
          setLogs(taskLogs);
        }
      } catch (e) {
        console.error("Error al cargar datos en modal de detalle:", e);
      }
    };

    if (isOpen) {
      loadTeamAndLogs();
      setActiveTab("details");
      setValidationError(null);

      // Rellenar campos si estamos editando
      if (task) {
        setType(task.type);
        setTitle(task.title);
        setDescription(task.description);
        setAssignedTo(task.assignedTo);
      } else {
        setType("HU");
        setTitle("");
        setDescription("");
        setAssignedTo(null);
      }
    }
  }, [isOpen, task, projectId, courseId, projectMembers]);

  if (!isOpen) return null;

  const isEditing = !!task;
  const isStudent = currentUser?.role === "estudiante";
  const isFrozen = isEditing && task?.status === "En Revisión" && isStudent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError("El título es obligatorio.");
      return;
    }
    if (!description.trim()) {
      setValidationError("La descripción es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        type,
        title: title.trim(),
        description: description.trim(),
        assignedTo,
      });
      onClose();
    } catch (e: any) {
      setValidationError(e.message || "Error al guardar los cambios");
    } finally {
      setLoading(false);
    }
  };

  const getStudentName = (studentId: string | null) => {
    if (!studentId) return "Sin asignar";
    const st = teamMembers.find((s) => s.id === studentId);
    return st ? st.nombre_completo : "Estudiante";
  };

  const formatLogDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/5 rounded-2xl shadow-2xl glass-panel flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Cabecera y Tabs */}
        <div className="p-4 border-b border-white/5 bg-white/2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {isEditing ? "Detalles del Requisito" : "Crear Nueva Tarjeta Ágil"}
            </h3>
            {isEditing && (
              <div className="flex gap-1.5 p-0.5 bg-zinc-900 border border-white/5 rounded-lg">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    activeTab === "details"
                      ? "bg-brand-purple text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 inline mr-1" />
                  General
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    activeTab === "history"
                      ? "bg-brand-purple text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <History className="w-3.5 h-3.5 inline mr-1" />
                  Auditoría ({logs.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {validationError && (
            <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 mb-4 animate-slide-up">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {activeTab === "details" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Congelamiento de Alcance Aviso */}
              {isFrozen && (
                <div className="p-3 bg-brand-amber/10 border border-brand-amber/20 text-brand-amber rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Alcance Congelado</p>
                    <p className="text-[11px] leading-relaxed text-gray-400 mt-0.5">
                      Esta tarjeta se encuentra en "En Revisión". Los estudiantes no pueden modificar el Título ni la Descripción para asegurar la integridad de la evaluación.
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback del Docente si existe */}
              {isEditing && task?.feedback_docente && (
                <div className="p-3.5 bg-brand-rose/5 border border-brand-rose/20 rounded-xl space-y-1">
                  <p className="text-[10px] text-brand-rose font-bold uppercase tracking-wider">
                    Retroalimentación del Docente:
                  </p>
                  <p className="text-xs text-gray-300 italic leading-relaxed">
                    "{task.feedback_docente}"
                  </p>
                </div>
              )}

              {/* Fila: Tipo de Requisito */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Tipo de Requisito *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isFrozen}
                    onClick={() => setType("HU")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      type === "HU"
                        ? "bg-brand-purple/20 border-brand-purple/40 text-brand-purple"
                        : "bg-zinc-900 border-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    Historia de Usuario (HU)
                  </button>
                  <button
                    type="button"
                    disabled={isFrozen}
                    onClick={() => setType("RF")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      type === "RF"
                        ? "bg-brand-blue/20 border-brand-blue/40 text-brand-blue"
                        : "bg-zinc-900 border-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    Requisito Funcional (RF)
                  </button>
                </div>
              </div>

              {/* Fila: Título */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Título del Requisito *
                </label>
                <input
                  type="text"
                  disabled={isFrozen}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. Como estudiante, quiero cargar archivos Excel para..."
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple disabled:opacity-60"
                />
              </div>

              {/* Fila: Descripción */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Criterios de Aceptación / Descripción *
                </label>
                <textarea
                  placeholder="Redacte detalladamente los requisitos o criterios de aceptación..."
                  rows={5}
                  disabled={isFrozen}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl p-3 focus:outline-none focus:border-brand-purple resize-none disabled:opacity-60"
                />
              </div>

              {/* Fila: Integrante Asignado */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Responsable Asignado
                </label>
                <select
                  value={assignedTo || ""}
                  onChange={(e) => setAssignedTo(e.target.value || null)}
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple cursor-pointer"
                >
                  <option value="">Sin Asignar (Disponible)</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nombre_completo} ({member.codigo_estudiante})
                    </option>
                  ))}
                </select>
              </div>

              {/* Footer Acciones */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                {isEditing && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    className="p-2 text-brand-rose hover:bg-brand-rose/10 rounded-xl transition-all cursor-pointer"
                    title="Borrar requisito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs font-semibold text-gray-300 rounded-xl cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-1 px-4 py-2 bg-brand-purple text-white text-xs font-semibold rounded-xl hover:bg-brand-purple/90 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {isEditing ? "Guardar Cambios" : "Crear Requisito"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Historial de Auditoría */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Historial de Cambios</span>
                <span className="text-[10px] text-gray-400">{logs.length} registros</span>
              </div>

              <div className="relative border-l border-white/10 pl-4 ml-2 space-y-5 py-2">
                {logs.length === 0 ? (
                  <p className="text-xs text-gray-500 italic pl-2">Aún no se registran movimientos en esta tarjeta.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="relative text-xs">
                      {/* Marker */}
                      <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-brand-purple/60 ring-4 ring-[#05070c]" />
                      
                      <div className="bg-white/2 border border-white/2 rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-white flex items-center gap-1">
                            <User className="w-3 h-3 text-brand-purple" />
                            {log.user_name}
                          </span>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatLogDate(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-300 mt-1 leading-normal">
                          Movió la tarjeta de{" "}
                          <span className="px-1.5 py-0.5 bg-black/40 text-gray-400 rounded text-[9px] border border-white/5">
                            {log.previous_status}
                          </span>{" "}
                          a{" "}
                          <span className="px-1.5 py-0.5 bg-brand-purple/20 text-brand-purple rounded text-[9px] border border-brand-purple/10 font-medium">
                            {log.new_status}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
