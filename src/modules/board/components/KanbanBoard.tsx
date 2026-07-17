"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboard } from "../../shared/components/Layout";
import { useBoard } from "../hooks/useBoard";
import {
  projectService,
  studentService,
  Student,
  Project,
  Task
} from "../../shared/services/firebase";
import { CardDetailModal } from "./CardDetailModal";
import { FeedbackModal } from "./FeedbackModal";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  Users,
  Briefcase,
  HelpCircle
} from "lucide-react";

export const KanbanBoard: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedCourse, selectedProjectId, setSelectedProjectId } = useDashboard();
  const { loadTasks, createTask, transitionTask, updateCardDetails, deleteCard, error: boardError } = useBoard();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Mobile column navigation state
  const [activeMobileCol, setActiveMobileCol] = useState<Task["status"]>("Backlog");

  // Modals state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [taskPendingRejection, setTaskPendingRejection] = useState<Task | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<Task["status"] | null>(null);

  const loadBoardData = async () => {
    if (!selectedCourse) return;
    try {
      const [projList, studList] = await Promise.all([
        projectService.getProjects(selectedCourse.id),
        studentService.getStudents(selectedCourse.id),
      ]);
      setProjects(projList);
      setStudents(studList);

      if (selectedProjectId) {
        const taskList = await loadTasks(selectedProjectId);
        setTasks(taskList);
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.error("Error al cargar datos del tablero:", e);
    }
  };

  useEffect(() => {
    loadBoardData();
  }, [selectedCourse, selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  const handleOpenCreate = () => {
    setSelectedTask(null);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleSaveCard = async (cardData: {
    type: "HU" | "RF";
    title: string;
    description: string;
    assignedTo: string | null;
  }) => {
    if (!selectedCourse || !selectedProjectId) return;

    if (selectedTask) {
      // Editar
      const success = await updateCardDetails(
        selectedTask,
        cardData.title,
        cardData.description,
        cardData.assignedTo,
        currentUser!.role
      );
      if (success) loadBoardData();
    } else {
      // Crear
      const success = await createTask({
        projectId: selectedProjectId,
        courseId: selectedCourse.id,
        ...cardData,
        status: "Backlog",
      });
      if (success) loadBoardData();
    }
  };

  const handleDeleteCard = async (taskId: string) => {
    const success = await deleteCard(taskId);
    if (success) {
      setIsDetailOpen(false);
      loadBoardData();
    }
  };

  // Manejar el movimiento de tarjetas con validación
  const handleMoveCard = async (task: Task, targetStatus: Task["status"]) => {
    if (!currentUser || !activeProject) return;

    // Si es una devolución de En Revisión a En Progreso o Backlog (y somos docentes), abrir modal de feedback
    if (task.status === "En Revisión" && (targetStatus === "En Progreso" || targetStatus === "Backlog")) {
      setTaskPendingRejection(task);
      setPendingTargetStatus(targetStatus);
      setIsFeedbackOpen(true);
      return;
    }

    // De lo contrario, proceder directamente
    const success = await transitionTask(
      task,
      targetStatus,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      activeProject.members
    );

    if (success) loadBoardData();
  };

  const handleConfirmRejection = async (feedback: string) => {
    if (!currentUser || !activeProject || !taskPendingRejection || !pendingTargetStatus) return;

    const success = await transitionTask(
      taskPendingRejection,
      pendingTargetStatus,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      activeProject.members,
      feedback
    );

    if (success) {
      setIsFeedbackOpen(false);
      setTaskPendingRejection(null);
      setPendingTargetStatus(null);
      loadBoardData();
    }
  };

  const getStudentName = (studentId: string | null) => {
    if (!studentId) return "";
    const s = students.find((st) => st.id === studentId);
    return s ? s.nombre_completo : "Estudiante";
  };

  const getStudentInitials = (studentId: string | null) => {
    if (!studentId) return "?";
    const name = getStudentName(studentId);
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const columns: { id: Task["status"]; label: string; color: string }[] = [
    { id: "Backlog", label: "Backlog", color: "border-t-brand-purple" },
    { id: "En Progreso", label: "En Progreso", color: "border-t-brand-blue" },
    { id: "En Revisión", label: "En Revisión", color: "border-t-brand-amber" },
    { id: "Completado", label: "Completado", color: "border-t-brand-emerald" },
  ];

  return (
    <div className="space-y-6">
      {/* Controles de Selección de Proyecto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-purple" />
            Tablero de Trabajo Ágil (Kanban)
          </h2>
          <p className="text-xs text-gray-400">
            {currentUser?.role === "estudiante"
              ? `Proyecto: ${activeProject?.name || "Cargando..."}`
              : "Selecciona el proyecto del curso que deseas auditar y calificar."}
          </p>
        </div>

        <div className="flex gap-3">
          {currentUser?.role === "docente" && (
            <select
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="text-xs bg-zinc-900 border border-white/5 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple cursor-pointer min-w-[200px]"
            >
              <option value="" disabled>Seleccionar Proyecto...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.members.length} integrantes)
                </option>
              ))}
            </select>
          )}

          {selectedProjectId && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1 px-3.5 py-2 bg-brand-purple text-white text-xs font-semibold rounded-xl hover:bg-brand-purple/90 transition-all shadow-md shadow-brand-purple/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Añadir HU/RF
            </button>
          )}
        </div>
      </div>

      {boardError && (
        <div className="p-3.5 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2.5 animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{boardError}</span>
        </div>
      )}

      {!selectedProjectId ? (
        <div className="p-12 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
          Por favor, selecciona un proyecto para visualizar el tablero de trabajo.
        </div>
      ) : (
        <>
          {/* Navegación por Pestañas en Celulares (Mobile UX) */}
          <div className="flex md:hidden bg-zinc-900/50 p-1 border border-white/5 rounded-xl">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              const isActive = activeMobileCol === col.id;

              return (
                <button
                  key={col.id}
                  onClick={() => setActiveMobileCol(col.id)}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                    isActive ? "bg-brand-purple text-white shadow" : "text-gray-400"
                  }`}
                >
                  {col.label} ({colTasks.length})
                </button>
              );
            })}
          </div>

          {/* Grid de Columnas (Desktop) u Vista Única (Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              const isColVisible = activeMobileCol === col.id;

              return (
                <div
                  key={col.id}
                  className={`flex flex-col bg-[#121214]/30 border border-white/5 rounded-2xl h-[calc(100vh-270px)] min-h-[480px] overflow-hidden ${
                    isColVisible ? "flex" : "hidden md:flex"
                  }`}
                >
                  {/* Cabecera Columna */}
                  <div className={`p-4 border-t-2 ${col.color} bg-white/2 border-b border-white/5 flex items-center justify-between`}>
                    <h3 className="font-bold text-white text-xs tracking-wide uppercase">{col.label}</h3>
                    <span className="px-2 py-0.5 bg-white/5 text-gray-400 rounded-full font-bold text-[9px]">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Listado Tarjetas */}
                  <div className="flex-1 overflow-y-auto p-3.5 gap-3 flex flex-col custom-scrollbar">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-8 text-[10px] text-gray-600 italic">Columna vacía</div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleOpenEdit(task)}
                          className="p-4 bg-[#18181b] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer shadow transition-all duration-150 space-y-3 relative group"
                        >
                          {/* Tipo de HU/RF */}
                          <div className="flex justify-between items-center">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[8px] uppercase border ${
                                task.type === "HU"
                                  ? "bg-white/5 text-purple-400 border-white/5"
                                  : "bg-white/5 text-blue-400 border-white/5"
                              }`}
                            >
                              {task.type === "HU" ? "H. Usuario" : "R. Funcional"}
                            </span>

                            {/* Indicador de Feedback Docente */}
                            {task.feedback_docente && (
                              <span
                                className="text-brand-rose flex items-center gap-0.5 text-[9px] font-bold"
                                title="Tiene retroalimentación del docente"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          <h5 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                            {task.title}
                          </h5>

                          {/* Fila Inferior: Asignado y Botones de Transición Rápida (Accesibilidad Movil/Tablet) */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            {/* Avatar Iniciales Asignado */}
                            {task.assignedTo ? (
                              <div
                                className="flex items-center gap-1.5"
                                title={`Asignado a: ${getStudentName(task.assignedTo)}`}
                              >
                                <div className="w-5 h-5 rounded-full bg-white/5 text-gray-300 border border-white/10 flex items-center justify-center font-bold text-[9px]">
                                  {getStudentInitials(task.assignedTo)}
                                </div>
                                <span className="text-[9px] text-gray-400 truncate max-w-[80px]">
                                  {getStudentName(task.assignedTo).split(" ")[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-gray-500 italic">Sin asignar</span>
                            )}

                            {/* Controles de Movimiento Rápido */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col.id !== "Backlog" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prevStatus =
                                      col.id === "En Progreso"
                                        ? "Backlog"
                                        : col.id === "En Revisión"
                                        ? "En Progreso"
                                        : "En Revisión";
                                    handleMoveCard(task, prevStatus);
                                  }}
                                  className="p-1 hover:bg-white/5 border border-white/5 rounded text-gray-400 hover:text-white cursor-pointer"
                                  title="Retroceder estado"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {col.id !== "Completado" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus =
                                      col.id === "Backlog"
                                        ? "En Progreso"
                                        : col.id === "En Progreso"
                                        ? "En Revisión"
                                        : "Completado";
                                    handleMoveCard(task, nextStatus);
                                  }}
                                  className="p-1 hover:bg-white/5 border border-white/5 rounded text-gray-400 hover:text-white cursor-pointer"
                                  title="Avanzar estado"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Detalles */}
      {selectedProjectId && selectedCourse && activeProject && (
        <CardDetailModal
          isOpen={isDetailOpen}
          task={selectedTask}
          projectId={selectedProjectId}
          courseId={selectedCourse.id}
          projectMembers={activeProject.members}
          onClose={() => setIsDetailOpen(false)}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
        />
      )}

      {/* Modal Feedback (Docente) */}
      {taskPendingRejection && (
        <FeedbackModal
          isOpen={isFeedbackOpen}
          cardTitle={taskPendingRejection.title}
          onClose={() => {
            setIsFeedbackOpen(false);
            setTaskPendingRejection(null);
            setPendingTargetStatus(null);
          }}
          onConfirm={handleConfirmRejection}
        />
      )}
    </div>
  );
};
