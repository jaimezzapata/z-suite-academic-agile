"use client";

import React, { useState, useEffect } from "react";
import { Task, boardService, ActivityLog, studentService, Student } from "../../shared/services/firebase";
import { useAuth } from "../../auth/hooks/useAuth";
import { AlertCircle, History, User, FileText, Trash2, Check, Clock, Plus, Edit2, Calendar } from "lucide-react";

interface CardDetailModalProps {
  isOpen: boolean;
  task: Task | null; // Null indica creación de nueva tarjeta (HU)
  projectId: string;
  courseId: string;
  projectMembers: string[];
  allTasks: Task[];
  onClose: () => void;
  onRefreshTasks?: () => Promise<void>;
  onSave: (taskData: {
    type: "HU";
    title: string;
    description: string;
    assignedTo: string | null;
    priority: "alta" | "media" | "baja";
    dueType: "date" | "days";
    dueDate: string;
    dueDays: number;
  }) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  isOpen,
  task,
  projectId,
  courseId,
  projectMembers,
  allTasks,
  onClose,
  onRefreshTasks,
  onSave,
  onDelete,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [isEditingMode, setIsEditingMode] = useState(false);
  
  // Estados de los campos principales de la HU
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media");
  const [dueType, setDueType] = useState<"date" | "days">("date");
  const [dueDate, setDueDate] = useState("");
  const [dueDays, setDueDays] = useState(7);
  
  // Fórmula HU
  const [como, setComo] = useState("");
  const [quiero, setQuiero] = useState("");
  const [para, setPara] = useState("");

  // Estados para creación y edición inline de Criterios de Aceptación (RFs)
  const [newRfTitle, setNewRfTitle] = useState("");
  const [newRfAssignedTo, setNewRfAssignedTo] = useState<string | null>(null);
  const [editingRfId, setEditingRfId] = useState<string | null>(null);
  const [editingRfTitle, setEditingRfTitle] = useState("");
  const [editingRfAssignedTo, setEditingRfAssignedTo] = useState<string | null>(null);
  
  const [teamMembers, setTeamMembers] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeamAndLogs = async () => {
      try {
        const studentsList = await studentService.getStudents(courseId);
        const filtered = studentsList.filter((s) => projectMembers.includes(s.id));
        setTeamMembers(filtered);

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
      setNewRfTitle("");
      // Pre-poblar el asignado del criterio con el responsable de la HU
      setNewRfAssignedTo(task?.assignedTo ?? null);
      setEditingRfId(null);
      setIsEditingMode(!task); // Si no hay tarea, forzar edición (modo creación)

      // Rellenar campos si estamos editando
      if (task) {
        setTitle(task.title);
        setAssignedTo(task.assignedTo);
        setPriority(task.priority || "media");
        setDueType(task.dueType || "date");
        setDueDate(task.dueDate || "");
        setDueDays(task.dueDays || 7);

        const desc = task.description || "";
        const comoMatch = desc.match(/Como\s+([^,]+)/i);
        const quieroMatch = desc.match(/quiero\s+([^,]+)/i);
        const paraMatch = desc.match(/para\s+(.+)/i);
        
        let parsedComo = comoMatch ? comoMatch[1].trim() : "";
        let parsedQuiero = quieroMatch ? quieroMatch[1].trim() : "";
        let parsedPara = paraMatch ? paraMatch[1].trim() : "";
        
        if (!parsedComo && !parsedQuiero && !parsedPara) {
          parsedQuiero = desc;
        }
        
        setComo(parsedComo);
        setQuiero(parsedQuiero);
        setPara(parsedPara);
      } else {
        setTitle("");
        setComo("");
        setQuiero("");
        setPara("");
        setAssignedTo(null);
        setPriority("media");
        setDueType("date");
        setDueDate("");
        setDueDays(7);
      }
    }
  }, [isOpen, task, projectId, courseId, projectMembers]);

  if (!isOpen) return null;

  const isEditing = !!task;
  const isStudent = currentUser?.role === "estudiante";
  const isFrozen = isEditing && task?.status === "En Revisión" && isStudent;

  // Criterios de Aceptación (RFs) vinculados a esta HU
  const linkedRfs = allTasks.filter((t) => t.type === "RF" && t.parentHuId === task?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError("El título es obligatorio.");
      return;
    }
    if (!como.trim() || !quiero.trim() || !para.trim()) {
      setValidationError("Todos los campos de la fórmula de la HU son obligatorios (Como, Quiero, Para).");
      return;
    }

    setLoading(true);
    try {
      let calculatedDueDate = dueDate;
      if (dueType === "days") {
        const days = parseInt(dueDays.toString()) || 0;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        calculatedDueDate = targetDate.toISOString().split("T")[0];
      }

      const finalDesc = `Como ${como.trim()}, quiero ${quiero.trim()}, para ${para.trim()}`;

      await onSave({
        type: "HU",
        title: title.trim(),
        description: finalDesc,
        assignedTo,
        priority,
        dueType,
        dueDate: calculatedDueDate,
        dueDays: parseInt(dueDays.toString()) || 0,
      });
      setIsEditingMode(false);
      if (onRefreshTasks) await onRefreshTasks();
    } catch (e: any) {
      setValidationError(e.message || "Error al guardar los cambios");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRfTitle.trim() || !task) return;
    try {
      await boardService.createTask({
        projectId,
        courseId,
        type: "RF",
        title: newRfTitle.trim(),
        description: `Criterio de aceptación para HU: ${task.title}`,
        status: "Backlog",
        // Hereda el responsable de la HU si no se seleccionó uno diferente
        assignedTo: newRfAssignedTo ?? task.assignedTo ?? null,
        parentHuId: task.id,
        inKanban: false
      });
      
      // Registrar creación de criterio
      await boardService.createActivityLog({
        courseId,
        projectId,
        task_id: task.id,
        task_title: task.title,
        user_id: currentUser!.id,
        user_name: currentUser!.name,
        previous_status: "Modificación",
        new_status: `Añadido criterio: ${newRfTitle.trim()}`,
      });

      setNewRfTitle("");
      // Mantener el responsable de la HU pre-seleccionado para el siguiente criterio
      setNewRfAssignedTo(task.assignedTo ?? null);
      if (onRefreshTasks) await onRefreshTasks();
    } catch (err) {
      console.error("Error al añadir criterio:", err);
    }
  };

  const handleToggleRfStatus = async (rf: Task, checked: boolean) => {
    try {
      const newStatus = checked ? "Completado" : "Backlog";
      await boardService.updateTask(rf.id, { status: newStatus });
      
      // Loggear la marca del checklist
      await boardService.createActivityLog({
        courseId,
        projectId,
        task_id: task!.id,
        task_title: task!.title,
        user_id: currentUser!.id,
        user_name: currentUser!.name,
        previous_status: rf.status,
        new_status: `${newStatus} (Criterio: ${rf.title})`,
      });

      if (onRefreshTasks) await onRefreshTasks();
    } catch (err) {
      console.error("Error al cambiar estado del criterio:", err);
    }
  };

  const handleDeleteRf = async (rfId: string) => {
    try {
      await boardService.deleteTask(rfId);
      if (onRefreshTasks) await onRefreshTasks();
    } catch (err) {
      console.error("Error al borrar criterio:", err);
    }
  };

  const handleSaveEditRf = async (rfId: string) => {
    if (!editingRfTitle.trim()) return;
    try {
      await boardService.updateTask(rfId, {
        title: editingRfTitle.trim(),
        assignedTo: editingRfAssignedTo,
      });
      setEditingRfId(null);
      if (onRefreshTasks) await onRefreshTasks();
    } catch (err) {
      console.error("Error al guardar criterio:", err);
    }
  };

  const handleStartEditRf = (rf: Task) => {
    setEditingRfId(rf.id);
    setEditingRfTitle(rf.title);
    setEditingRfAssignedTo(rf.assignedTo);
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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start md:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm -z-10" onClick={onClose} />

      {/* Modal Container */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${isEditing ? "max-w-4xl md:max-h-[85vh] md:overflow-hidden h-auto" : "max-w-lg h-auto"} bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl glass-panel flex flex-col my-4 md:my-8 transition-all duration-300 animate-slide-up`}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-50 uppercase tracking-wider">
            {isEditing ? "Detalles de la Historia de Usuario" : "Crear Nueva Historia de Usuario (HU)"}
          </h3>
          {isEditing && (
            <div className="flex gap-1.5 p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  activeTab === "details"
                    ? "bg-brand-purple text-white"
                    : "text-zinc-500 hover:text-zinc-100"
                }`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-brand-purple text-white"
                    : "text-zinc-500 hover:text-zinc-100"
                }`}
              >
                <History className="w-3.5 h-3.5 inline mr-1" />
                Auditoría ({logs.length})
              </button>
            </div>
          )}
        </div>

        {/* Cuerpo del Modal */}
        {isEditing ? (
          /* VISTA DUAL-COLUMN PARA HU CREADA */
          <div className="flex-1 flex flex-col md:flex-row overflow-visible md:overflow-hidden min-h-0">
            {/* Columna Izquierda: Información de la HU (Fórmula / Formulario) */}
            <div className="w-full md:w-1/2 p-6 overflow-visible md:overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col min-h-0">
              {validationError && (
                <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 mb-4 animate-slide-up">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {activeTab === "details" ? (
                isEditingMode ? (
                  /* Modo Formulario (Edición de HU Creada) */
                  <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {isFrozen && (
                        <div className="p-3 bg-brand-amber/10 border border-brand-amber/20 text-brand-amber rounded-xl text-xs flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold">Alcance Congelado</p>
                            <p className="text-[11px] leading-relaxed text-gray-400 mt-0.5">
                              Esta tarjeta se encuentra en "En Revisión". Los estudiantes no pueden modificar la descripción.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Título *</label>
                        <input
                          type="text"
                          disabled={isFrozen}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 disabled:opacity-60 focus:outline-none focus:border-brand-purple"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Como (Rol) *</label>
                        <input
                          type="text"
                          disabled={isFrozen}
                          value={como}
                          onChange={(e) => setComo(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 disabled:opacity-60 focus:outline-none focus:border-brand-purple"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Quiero (Acción) *</label>
                        <input
                          type="text"
                          disabled={isFrozen}
                          value={quiero}
                          onChange={(e) => setQuiero(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 disabled:opacity-60 focus:outline-none focus:border-brand-purple"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Para (Valor) *</label>
                        <input
                          type="text"
                          disabled={isFrozen}
                          value={para}
                          onChange={(e) => setPara(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 disabled:opacity-60 focus:outline-none focus:border-brand-purple"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Prioridad *</label>
                        <div className="flex gap-2">
                          {(["baja", "media", "alta"] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPriority(p)}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer capitalize ${
                                priority === p
                                  ? p === "alta"
                                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                                    : p === "media"
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                    : "bg-blue-500/20 border-blue-500/40 text-blue-400"
                                  : "bg-zinc-900 border-white/5 text-gray-400"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Definición Entrega</label>
                          <select
                            value={dueType}
                            onChange={(e) => setDueType(e.target.value as any)}
                            className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-300 rounded-xl px-3 py-2 focus:outline-none"
                          >
                            <option value="date">Calendario</option>
                            <option value="days">Días</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                            {dueType === "date" ? "Fecha límite" : "Número de días"}
                          </label>
                          {dueType === "date" ? (
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                            />
                          ) : (
                            <input
                              type="number"
                              min="1"
                              value={dueDays}
                              onChange={(e) => setDueDays(parseInt(e.target.value) || 1)}
                              className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Responsable</label>
                        <select
                          value={assignedTo || ""}
                          onChange={(e) => setAssignedTo(e.target.value || null)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-300 rounded-xl px-3 py-2 cursor-pointer"
                        >
                          <option value="">Sin Asignar</option>
                          {teamMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.nombre_completo}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsEditingMode(false)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs font-semibold text-gray-300 rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-brand-purple text-white text-xs font-semibold rounded-xl hover:bg-brand-purple/90"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                ) : (
                  /* MODO PROSE REDACTADO (NO FORMULARIO) */
                  <div className="flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-5">
                      {/* Retroalimentación docente si existe */}
                      {task?.feedback_docente && (
                        <div className="p-3 bg-brand-rose/5 border border-brand-rose/25 rounded-xl">
                          <span className="text-[9px] text-brand-rose font-bold uppercase tracking-wider block">Feedback del Docente</span>
                          <p className="text-xs text-gray-200 italic mt-0.5">"{task.feedback_docente}"</p>
                        </div>
                      )}

                      {/* Título */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">Título de la HU</span>
                        <h2 className="text-base font-bold text-zinc-50 leading-snug">{title}</h2>
                      </div>

                      {/* Prose Redactado */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-brand-purple uppercase font-bold tracking-wider block">Redacción Completa (HU)</span>
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl leading-relaxed text-xs text-zinc-500 shadow-inner">
                          Como <span className="text-zinc-50 font-bold">"{como}"</span>, 
                          quiero <span className="text-zinc-50 font-bold">"{quiero}"</span>, 
                          para <span className="text-zinc-50 font-bold">"{para}"</span>.
                        </div>
                      </div>

                      {/* Datos / Planificación */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs">
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase font-bold block">Prioridad</span>
                          <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                            priority === "alta"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                              : priority === "media"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          }`}>
                            {priority}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase font-bold block">Entrega Estimada</span>
                          <span className="text-zinc-100 font-bold flex items-center gap-1 mt-2">
                            <Calendar className="w-3.5 h-3.5 text-brand-purple" />
                            {dueDate || "Sin definir"}
                          </span>
                        </div>
                        <div className="col-span-2 border-t border-zinc-800 pt-2.5 mt-1">
                          <span className="text-[9px] text-zinc-500 uppercase font-bold block">Miembro Responsable</span>
                          <span className="text-zinc-50 font-semibold block mt-1.5">
                            {assignedTo ? getStudentName(assignedTo) : "Sin asignar"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-6">
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(task.id)}
                          className="p-2 text-brand-rose hover:bg-brand-rose/10 rounded-xl transition-all"
                          title="Eliminar Historia"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setIsEditingMode(true)}
                          className="flex items-center gap-1 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300 rounded-xl transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar HU
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-gray-300 rounded-xl border border-white/5"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* Historial de Auditoría */
                <div className="space-y-4 flex-1 flex flex-col justify-between min-h-0">
                  <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 max-h-[50vh]">
                    <div className="relative border-l border-white/10 pl-4 ml-2 space-y-5 py-2">
                      {logs.length === 0 ? (
                        <p className="text-xs text-gray-500 italic pl-2">Aún no se registran movimientos en esta tarjeta.</p>
                      ) : (
                        logs.map((log) => (
                          <div key={log.id} className="relative text-xs">
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
                  <div className="pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-zinc-900 border border-white/5 text-xs font-semibold text-gray-300 rounded-xl w-full"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha: Criterios de Aceptación (Checklist) */}
            <div className="w-full md:w-1/2 p-6 flex flex-col overflow-visible md:overflow-hidden min-h-0 bg-zinc-900/40">
              <div className="mb-4">
                <h4 className="text-xs font-bold text-zinc-50 uppercase tracking-wider">Criterios de Aceptación</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Checklist de requisitos individuales. Marca para completar inline.
                </p>
              </div>

              {/* Formulario Inline para Añadir RF */}
              <form onSubmit={handleAddRf} className="flex flex-col sm:flex-row gap-2 bg-zinc-800 border border-zinc-700 p-2.5 rounded-xl mb-4">
                <input
                  type="text"
                  placeholder="Nuevo criterio..."
                  value={newRfTitle}
                  onChange={(e) => setNewRfTitle(e.target.value)}
                  className="flex-1 text-xs bg-zinc-950 border border-zinc-800 text-zinc-50 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-purple placeholder-zinc-500"
                />
                <select
                  value={newRfAssignedTo || ""}
                  onChange={(e) => setNewRfAssignedTo(e.target.value || null)}
                  className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer max-w-[120px]"
                >
                  <option value="">Miembro</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre_completo.split(" ")[0]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!newRfTitle.trim()}
                  className="px-3 py-1.5 bg-brand-purple text-white text-xs font-bold rounded-lg hover:bg-brand-purple/90 transition-all disabled:opacity-40"
                >
                  +
                </button>
              </form>

              {/* Listado de RFs vinculados con scroll local */}
              <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar pr-1 space-y-2 min-h-0">
                {linkedRfs.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-6 text-center">
                    No hay criterios de aceptación definidos para esta HU.
                  </p>
                ) : (
                  linkedRfs.map((rf) => {
                    const isRfEditing = editingRfId === rf.id;
                    const isCompleted = rf.status === "Completado";

                    return (
                      <div
                        key={rf.id}
                        className={`p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 transition-all ${
                          isCompleted ? "opacity-65 border-emerald-500/10" : ""
                        }`}
                      >
                        {isRfEditing ? (
                          <div className="flex-1 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingRfTitle}
                              onChange={(e) => setEditingRfTitle(e.target.value)}
                              className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-50 rounded px-2.5 py-1 focus:outline-none"
                            />
                            <div className="flex gap-2 items-center">
                              <select
                                value={editingRfAssignedTo || ""}
                                onChange={(e) => setEditingRfAssignedTo(e.target.value || null)}
                                className="flex-1 text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 rounded px-2.5 py-1"
                              >
                                <option value="">Sin Asignar</option>
                                {teamMembers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.nombre_completo}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveEditRf(rf.id)}
                                className="px-2.5 py-1 bg-brand-purple text-white text-[10px] font-bold rounded"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRfId(null)}
                                className="px-2.5 py-1 bg-zinc-800 text-gray-400 text-[10px] font-bold rounded"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={(e) => handleToggleRfStatus(rf, e.target.checked)}
                                className="w-4 h-4 border-zinc-800 bg-zinc-950 text-brand-purple rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <span className={`text-xs text-zinc-50 font-semibold block truncate ${
                                  isCompleted ? "line-through text-zinc-500" : ""
                                }`}>
                                  {rf.title}
                                </span>
                                <span className="text-[9px] text-zinc-500">
                                  Responsable: {getStudentName(rf.assignedTo)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditRf(rf)}
                                className="p-1 hover:bg-white/5 text-gray-500 hover:text-white rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRf(rf.id)}
                                className="p-1 hover:bg-brand-rose/10 text-gray-600 hover:text-brand-rose rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* MODO DE CREACIÓN DE HU (MODAL DE COLUMNA ÚNICA ANGOSTA) */
          <div className="p-6 overflow-y-auto custom-scrollbar">
            {validationError && (
              <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 mb-4 animate-slide-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Título de la HU *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. Inicio de sesión de alumnos"
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Como (Rol) *</label>
                <input
                  type="text"
                  value={como}
                  onChange={(e) => setComo(e.target.value)}
                  placeholder="ej. Estudiante matriculado"
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Quiero (Acción) *</label>
                <input
                  type="text"
                  value={quiero}
                  onChange={(e) => setQuiero(e.target.value)}
                  placeholder="ej. Ingresar con mi correo institucional"
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Para (Valor) *</label>
                <input
                  type="text"
                  value={para}
                  onChange={(e) => setPara(e.target.value)}
                  placeholder="ej. Visualizar mis equipos asignados"
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Prioridad *</label>
                <div className="flex gap-2">
                  {(["baja", "media", "alta"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer capitalize ${
                        priority === p
                          ? p === "alta"
                            ? "bg-red-500/20 border-red-500/40 text-red-400"
                            : p === "media"
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                            : "bg-blue-500/20 border-blue-500/40 text-blue-400"
                          : "bg-zinc-900 border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Definición de Entrega</label>
                  <select
                    value={dueType}
                    onChange={(e) => setDueType(e.target.value as any)}
                    className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-300 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                  >
                    <option value="date">Calendario</option>
                    <option value="days">Cantidad de Días</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  {dueType === "date" ? (
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={dueDays}
                      onChange={(e) => setDueDays(parseInt(e.target.value) || 1)}
                      className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Responsable Asignado</label>
                <select
                  value={assignedTo || ""}
                  onChange={(e) => setAssignedTo(e.target.value || null)}
                  className="w-full text-xs bg-zinc-900 border border-white/5 text-gray-300 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                >
                  <option value="">Sin Asignar</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nombre_completo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs font-semibold text-gray-300 rounded-xl"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-purple text-white text-xs font-semibold rounded-xl hover:bg-brand-purple/90 transition-all"
                >
                  Crear Historia
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
