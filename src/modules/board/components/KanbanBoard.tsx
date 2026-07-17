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
import { db } from "../../../../sdk-firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { CardDetailModal } from "./CardDetailModal";
import { FeedbackModal } from "./FeedbackModal";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  Briefcase,
  Edit2,
  Calendar,
  ClipboardList,
  FolderKanban,
  Upload,
  Download
} from "lucide-react";
import { toast } from "sonner";

export const KanbanBoard: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedCourse, selectedProjectId, setSelectedProjectId } = useDashboard();
  const {
    loadTasks,
    createTask,
    transitionTask,
    updateCardDetails,
    deleteCard,
    activateTaskInKanban,
    error: boardError
  } = useBoard();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Backlog vs Kanban tabs navigation
  const [activeTab, setActiveTab] = useState<"backlog" | "kanban">("backlog");

  // Mobile column navigation state
  const [activeMobileCol, setActiveMobileCol] = useState<Task["status"]>("Backlog");

  // Kanban filter states (search by title and priority)
  const [searchTaskQuery, setSearchTaskQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<"ALL" | "alta" | "media" | "baja">("ALL");

  // Modals state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [taskPendingRejection, setTaskPendingRejection] = useState<Task | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<Task["status"] | null>(null);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Task["status"] | null>(null);

  const loadBoardData = async () => {
    if (!selectedCourse) return;
    try {
      const [projList, studList] = await Promise.all([
        projectService.getProjects(selectedCourse.id),
        studentService.getStudents(selectedCourse.id),
      ]);
      setProjects(projList);
      setStudents(studList);
    } catch (e) {
      console.error("Error al cargar datos del tablero:", e);
    }
  };

  useEffect(() => {
    loadBoardData();
  }, [selectedCourse]);

  // Escuchador en tiempo real para las tareas de este proyecto
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", selectedProjectId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const taskList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(taskList);
      },
      (error) => {
        console.error("Error en la suscripción en tiempo real de tareas:", error);
      }
    );

    return () => unsubscribe();
  }, [selectedProjectId]);

  // Si cambia el rol y es estudiante, auto-seleccionar su proyecto
  useEffect(() => {
    if (currentUser?.role === "estudiante" && projects.length > 0) {
      const myProject = projects.find((p) => p.members.includes(currentUser.id));
      if (myProject && selectedProjectId !== myProject.id) {
        setSelectedProjectId(myProject.id);
      }
    }
  }, [projects, currentUser, setSelectedProjectId, selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Filtrado de HUs por búsqueda y prioridad
  const filteredTasks = tasks.filter((task) => {
    if (task.type !== "HU") return false;
    const matchesSearch = task.title.toLowerCase().includes(searchTaskQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTaskQuery.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const handleOpenCreate = () => {
    setSelectedTask(null);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleActivateTask = async (task: Task) => {
    if (!currentUser) return;
    
    // Actualización optimista instantánea
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id ? { ...t, inKanban: true, status: "Backlog" } : t
      )
    );

    try {
      const success = await activateTaskInKanban(task, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });
      if (!success) {
        // Revertir en caso de fallo
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, inKanban: false } : t
          )
        );
      } else {
        // Cargar en background para refrescar
        if (selectedProjectId) {
          const taskList = await loadTasks(selectedProjectId);
          setTasks(taskList);
        }
      }
    } catch (err) {
      // Revertir en caso de excepción
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? { ...t, inKanban: false } : t
        )
      );
    }
  };

  const handleSaveCard = async (cardData: {
    type: "HU";
    title: string;
    description: string;
    assignedTo: string | null;
    priority: "alta" | "media" | "baja";
    dueType: "date" | "days";
    dueDate: string;
    dueDays: number;
  }) => {
    if (!selectedCourse || !selectedProjectId) return;

    if (selectedTask) {
      // Editar HU
      const success = await updateCardDetails(
        selectedTask,
        cardData.title,
        cardData.description,
        cardData.assignedTo,
        currentUser!.role,
        null, // parentHuId
        cardData.priority,
        cardData.dueType,
        cardData.dueDate,
        cardData.dueDays
      );
      if (success) loadBoardData();
    } else {
      // Crear HU (empieza en Backlog como borrador)
      const success = await createTask({
        projectId: selectedProjectId,
        courseId: selectedCourse.id,
        ...cardData,
        status: "Backlog",
        inKanban: false
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

    // Si requiere feedback del docente al devolver de En Revisión
    const needsFeedback = task.status === "En Revisión" && 
      (targetStatus === "En Progreso" || targetStatus === "Backlog");

    if (needsFeedback) {
      setTaskPendingRejection(task);
      setPendingTargetStatus(targetStatus);
      setIsFeedbackOpen(true);
      return;
    }

    // --- ACTUALIZACIÓN OPTIMISTA ---
    const oldStatus = task.status;

    // Validaciones locales rápidas
    if (targetStatus === "Completado" && currentUser.role !== "docente" && currentUser.role !== "admin") {
      toast.error("Acción denegada: Solo el Docente puede aprobar y mover tarjetas a 'Completado'.");
      return;
    }
    if (targetStatus === "En Progreso" && !task.assignedTo) {
      toast.error("Acción denegada: No se puede mover a 'En Progreso' sin un integrante asignado.");
      return;
    }

    // Actualizar localmente de inmediato
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id ? { ...t, status: targetStatus } : t
      )
    );

    try {
      const success = await transitionTask(
        task,
        targetStatus,
        { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        activeProject.members
      );
      if (!success) {
        // Revertir en caso de respuesta insatisfactoria
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, status: oldStatus } : t
          )
        );
      } else {
        // Refrescar datos en segundo plano para marcas de tiempo reales
        if (selectedProjectId) {
          const taskList = await loadTasks(selectedProjectId);
          setTasks(taskList);
        }
      }
    } catch (err) {
      // Revertir en caso de excepción
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? { ...t, status: oldStatus } : t
        )
      );
    }
  };

  const handleConfirmRejection = async (feedback: string) => {
    if (!taskPendingRejection || !pendingTargetStatus || !currentUser || !activeProject) return;

    const task = taskPendingRejection;
    const targetStatus = pendingTargetStatus;
    const oldStatus = task.status;

    // Cerrar modal y actualizar estado optimista de inmediato
    setIsFeedbackOpen(false);
    setTaskPendingRejection(null);
    setPendingTargetStatus(null);

    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id ? { ...t, status: targetStatus, feedback_docente: feedback } : t
      )
    );

    try {
      const success = await transitionTask(
        task,
        targetStatus,
        { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        activeProject.members,
        feedback
      );

      if (!success) {
        // Revertir
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, status: oldStatus, feedback_docente: task.feedback_docente } : t
          )
        );
      } else {
        if (selectedProjectId) {
          const taskList = await loadTasks(selectedProjectId);
          setTasks(taskList);
        }
      }
    } catch (err) {
      // Revertir
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? { ...t, status: oldStatus, feedback_docente: task.feedback_docente } : t
        )
      );
    }
  };

  // Manejadores para Drag and Drop
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    const isStudent = currentUser?.role === "estudiante";
    const isFrozen = task.status === "En Revisión" && isStudent;
    if (isFrozen) {
      e.preventDefault();
      return;
    }
    setDraggingTask(task);
    // Es indispensable establecer datos en dataTransfer para que Firefox y Chrome inicien el gesto de arrastre
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: Task["status"]) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDrop = async (e: React.DragEvent, colId: Task["status"]) => {
    e.preventDefault();
    setDragOverCol(null);
    
    // Obtener el ID de la tarjeta del dataTransfer (es el método más robusto entre re-renders)
    const taskId = e.dataTransfer.getData("text/plain");
    const taskToMove = tasks.find((t) => t.id === (taskId || (draggingTask && draggingTask.id)));
    
    if (!taskToMove) return;
    if (taskToMove.status === colId) return;

    await handleMoveCard(taskToMove, colId);
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

  const handleExportJson = () => {
    if (!activeProject) return;

    const hus = tasks.filter((t) => t.type === "HU");
    const exportedData = hus.map((hu) => {
      const childRfs = tasks.filter((t) => t.type === "RF" && t.parentHuId === hu.id);
      const huAssignee = students.find((s) => s.id === hu.assignedTo);
      
      return {
        title: hu.title,
        description: hu.description,
        priority: hu.priority || "media",
        dueDate: hu.dueDate || "",
        status: hu.status || "Backlog",
        inKanban: hu.inKanban !== false,
        assignedTo: huAssignee ? huAssignee.correo_institucional : hu.assignedTo,
        criterios: childRfs.map((rf) => {
          const rfAssignee = students.find((s) => s.id === rf.assignedTo);
          return {
            title: rf.title,
            status: rf.status || "Pendiente",
            assignedTo: rfAssignee ? rfAssignee.correo_institucional : rf.assignedTo
          };
        })
      };
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportedData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backlog-${activeProject.name.toLowerCase().replace(/\s+/g, "-")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = () => {
    document.getElementById("import-json-input")?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourse || !selectedProjectId) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") return;

        const importedData = JSON.parse(text);
        if (!Array.isArray(importedData)) {
          toast.error("Error: El archivo JSON debe ser una lista de Historias de Usuario.");
          return;
        }

        let importCount = 0;
        let criteriaCount = 0;

        for (const item of importedData) {
          let assignedToId: string | null = null;
          if (item.assignedTo) {
            const s = students.find(
              (st) => st.correo_institucional === item.assignedTo || st.nombre_completo === item.assignedTo || st.id === item.assignedTo
            );
            if (s) assignedToId = s.id;
          }

          const newHu = await createTask({
            projectId: selectedProjectId,
            courseId: selectedCourse.id,
            type: "HU",
            title: item.title || "Sin título",
            description: item.description || "",
            priority: item.priority || "media",
            status: item.status || "Backlog",
            inKanban: item.inKanban !== undefined ? item.inKanban : false,
            assignedTo: assignedToId,
            dueDate: item.dueDate || ""
          });

          if (newHu) {
            importCount++;

            if (Array.isArray(item.criterios)) {
              for (const rf of item.criterios) {
                let rfAssignedToId: string | null = null;
                if (rf.assignedTo) {
                  const s = students.find(
                    (st) => st.correo_institucional === rf.assignedTo || st.nombre_completo === rf.assignedTo || st.id === rf.assignedTo
                  );
                  if (s) rfAssignedToId = s.id;
                }

                await createTask({
                  projectId: selectedProjectId,
                  courseId: selectedCourse.id,
                  type: "RF",
                  parentHuId: newHu.id,
                  title: rf.title || "Sin título",
                  description: "",
                  status: rf.status || "Pendiente",
                  priority: "media",
                  assignedTo: rfAssignedToId,
                  inKanban: false
                });
                criteriaCount++;
              }
            }
          }
        }

        toast.success(`Éxito: Se importaron ${importCount} HUs con ${criteriaCount} criterios de aceptación.`);
        loadBoardData();
      } catch (err) {
        console.error("Error al importar JSON:", err);
        toast.error("Error al procesar el archivo JSON. Verifique el formato.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-purple" />
            {activeProject ? activeProject.name : "Planificación y Control Ágil (HUs)"}
          </h2>
          <p className="text-xs text-zinc-400">
            {activeProject
              ? "Tablero Kanban de Planificación y Control de Historias de Usuario"
              : "Selecciona el proyecto del curso que deseas auditar y calificar."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser?.role === "docente" && (
            <select
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-50 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple cursor-pointer min-w-[200px]"
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
            <>
              {/* Input de archivo oculto para Importación */}
              <input
                type="file"
                id="import-json-input"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                onClick={handleImportJson}
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 hover:text-zinc-50 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                title="Importar HUs desde archivo JSON"
              >
                <Upload className="w-3.5 h-3.5 text-brand-purple" />
                Importar
              </button>

              <button
                onClick={handleExportJson}
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 hover:text-zinc-50 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                title="Exportar HUs a formato JSON"
              >
                <Download className="w-3.5 h-3.5 text-brand-purple" />
                Exportar
              </button>
            </>
          )}

          {selectedProjectId && activeTab === "backlog" && (
            <button
              onClick={handleOpenCreate}
              type="button"
              className="flex items-center gap-1 px-3.5 py-2 bg-brand-purple text-white text-xs font-semibold rounded-xl hover:bg-brand-purple/90 transition-all shadow-md shadow-brand-purple/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva HU
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
          {/* Selector de Pestañas (Backlog vs Kanban) */}
          <div className="flex border-b border-white/5 gap-6 mb-2">
            <button
              onClick={() => setActiveTab("backlog")}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "backlog"
                  ? "border-brand-purple text-brand-purple font-bold"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <ClipboardList className="w-4.5 h-4.5" />
              Backlog del Proyecto
              <span className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-gray-400">
                {tasks.filter((t) => t.type === "HU").length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === "kanban"
                  ? "border-brand-purple text-brand-purple font-bold"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <FolderKanban className="w-4.5 h-4.5" />
              Tablero Kanban
              <span className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-gray-400">
                {tasks.filter((t) => t.type === "HU" && t.inKanban !== false).length}
              </span>
            </button>
          </div>

          {activeTab === "backlog" ? (
            <div className="space-y-4">
              {/* Cabecera y Filtros de Búsqueda de Backlog */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/20 p-4 border border-white/5 rounded-2xl">
                <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar HU por título o descripción..."
                    value={searchTaskQuery}
                    onChange={(e) => setSearchTaskQuery(e.target.value)}
                    className="text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple placeholder-gray-600 w-full sm:w-64"
                  />
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value as any)}
                    className="text-xs bg-zinc-950 border border-white/5 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple cursor-pointer w-full sm:w-auto"
                  >
                    <option value="ALL">Todas las Prioridades</option>
                    <option value="alta">Prioridad Alta</option>
                    <option value="media">Prioridad Media</option>
                    <option value="baja">Prioridad Baja</option>
                  </select>
                </div>
              </div>

              {/* Listado de Historias de Usuario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredTasks.length === 0 ? (
                  <div className="p-12 col-span-full text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl glass-panel text-gray-500 italic">
                    No se encontraron historias de usuario en el backlog.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const isTaskInKanban = task.inKanban !== false;
                    
                    const total = tasks.filter((t) => t.type === "RF" && t.parentHuId === task.id).length;
                    const completed = tasks.filter((t) => t.type === "RF" && t.parentHuId === task.id && t.status === "Completado").length;
                    const progressPercentage = total > 0 ? (completed / total) * 100 : 0;

                    return (
                      <div
                        key={task.id}
                        className={`p-4 bg-zinc-950 border rounded-xl flex flex-col justify-between min-h-[220px] transition-all duration-200 relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                          isTaskInKanban 
                            ? "border-zinc-800/40 opacity-75"
                            : "border-zinc-800 hover:border-brand-purple/40"
                        }`}
                      >
                        {/* Línea de color superior basada en prioridad */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-[3px] ${
                            task.priority === "alta"
                              ? "bg-red-500"
                              : task.priority === "media"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        />

                        <div className="space-y-2.5 flex-1">
                          <div className="flex justify-between items-center">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[8px] uppercase tracking-wider border ${
                                task.priority === "alta"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                  : task.priority === "media"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              }`}
                            >
                              Prioridad {task.priority || "media"}
                            </span>

                            {isTaskInKanban ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[7px] uppercase">
                                Kanban
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[7px] uppercase">
                                Backlog
                              </span>
                            )}
                          </div>

                          <h4 
                            className="font-bold text-zinc-50 text-xs line-clamp-2 cursor-pointer hover:text-brand-purple transition-colors"
                            onClick={() => handleOpenEdit(task)}
                          >
                            {task.title}
                          </h4>
                          <p className="text-[10px] text-zinc-400 leading-normal line-clamp-3">
                            {task.description}
                          </p>
                        </div>

                        {/* Sección media y baja: progreso y entrega/acciones */}
                        <div className="space-y-2.5 pt-2 border-t border-zinc-800/40 mt-3">
                          {/* Criterios de Aceptación */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-semibold text-zinc-500">
                              <span>Criterios</span>
                              <span>{completed}/{total}</span>
                            </div>
                            <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-1 rounded-full transition-all duration-300 ${
                                  progressPercentage === 100 ? "bg-emerald-500" : "bg-brand-purple"
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Fila inferior de entrega y responsable / botones */}
                          <div className="flex items-center justify-between pt-1 text-[9px]">
                            {task.dueDate ? (
                              <span className="flex items-center gap-0.5 text-zinc-500 dark:text-gray-400 font-medium">
                                <Calendar className="w-2.5 h-2.5 text-brand-purple" />
                                {task.dueDate.split("-").slice(1).join("-")}
                              </span>
                            ) : (
                              <span className="text-zinc-500 italic">S.D.</span>
                            )}

                            <div className="flex items-center gap-2">
                              {/* Responsable */}
                              {task.assignedTo ? (
                                <div
                                  className="w-4.5 h-4.5 rounded-full bg-zinc-900 text-zinc-100 border border-zinc-800 flex items-center justify-center font-bold text-[8px]"
                                  title={`Responsable: ${getStudentName(task.assignedTo)}`}
                                >
                                  {getStudentInitials(task.assignedTo)}
                                </div>
                              ) : (
                                <span className="text-[8px] text-zinc-500 italic">Sin asig.</span>
                              )}

                              {/* Botones de acción */}
                              <button
                                onClick={() => handleOpenEdit(task)}
                                className="p-1 hover:bg-zinc-900 border border-zinc-800/40 text-zinc-500 hover:text-zinc-50 rounded transition-all"
                                title="Editar Detalles"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>

                              {!isTaskInKanban ? (
                                <button
                                  onClick={() => handleActivateTask(task)}
                                  className="px-2 py-1 bg-brand-purple hover:bg-brand-purple/90 text-white text-[8px] font-bold rounded transition-all cursor-pointer"
                                  title="Pasar a Kanban"
                                >
                                  🚀 Activar
                                </button>
                              ) : (
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 text-[8px] font-bold rounded">
                                  ✓ Activo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Navegación por Columnas en Celulares (Mobile UX) */}
              <div className="flex md:hidden bg-zinc-900/50 p-1 border border-white/5 rounded-xl mb-4">
                {columns.map((col) => {
                  const activeKanbanTasks = filteredTasks.filter((t) => t.inKanban !== false);
                  const colTasks = activeKanbanTasks.filter((t) => t.status === col.id);
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
                  const activeKanbanTasks = filteredTasks.filter((t) => t.inKanban !== false);
                  const colTasks = activeKanbanTasks.filter((t) => t.status === col.id);
                  const isColVisible = activeMobileCol === col.id;

                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDragLeave={() => setDragOverCol(null)}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className={`flex flex-col bg-zinc-950/30 border border-zinc-800 rounded-2xl h-[calc(100vh-270px)] min-h-[480px] overflow-hidden transition-all duration-200 ${
                        dragOverCol === col.id
                          ? "border-brand-purple bg-brand-purple/10 dark:bg-brand-purple/5 shadow-inner"
                          : ""
                      } ${isColVisible ? "flex" : "hidden md:flex"}`}
                    >
                      {/* Cabecera Columna */}
                      <div className={`p-4 border-t-2 ${col.color} bg-zinc-900/20 border-b border-zinc-800 flex items-center justify-between`}>
                        <h3 className="font-bold text-zinc-50 text-xs tracking-wide uppercase">{col.label}</h3>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-100 rounded-full font-bold text-[9px]">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Listado Tarjetas */}
                      <div className="flex-1 overflow-y-auto p-3.5 gap-3 flex flex-col custom-scrollbar">
                        {colTasks.length === 0 ? (
                          <div className="text-center py-8 text-[10px] text-zinc-500 italic">Columna vacía</div>
                        ) : (
                          colTasks.map((task) => {
                            const isStudent = currentUser?.role === "estudiante";
                            const isFrozen = task.status === "En Revisión" && isStudent;

                            return (
                              <div
                                key={task.id}
                                draggable={!isFrozen}
                                onDragStart={(e) => handleDragStart(e, task)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleOpenEdit(task)}
                                className={`bg-zinc-900 border border-zinc-800 hover:border-brand-purple/40 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all duration-150 relative group overflow-hidden select-none flex flex-col min-h-[170px] ${
                                  isFrozen
                                    ? "cursor-not-allowed opacity-70"
                                    : "active:scale-[0.98] active:opacity-80 hover:-translate-y-0.5"
                                }`}
                              >
                                {/* Accent Top Line based on priority */}
                                <div
                                  className={`absolute top-0 left-0 right-0 h-[3px] ${
                                    task.priority === "alta"
                                      ? "bg-red-500 shadow-sm shadow-red-500/50"
                                      : task.priority === "media"
                                      ? "bg-amber-500 shadow-sm shadow-amber-500/50"
                                      : "bg-blue-500 shadow-sm shadow-blue-500/50"
                                  }`}
                                />

                                {/* Card Body */}
                                <div className="p-4 pt-5 flex flex-col gap-2.5 flex-1">
                                  {/* Header Row: Priority + Date + Feedback */}
                                  <div className="flex justify-between items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider border ${
                                        task.priority === "alta"
                                          ? "bg-red-500/15 text-red-400 border-red-500/30"
                                          : task.priority === "media"
                                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                          : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                      }`}
                                    >
                                      Prioridad {task.priority || "media"}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {task.feedback_docente && (
                                        <span
                                          className="text-brand-rose flex items-center gap-0.5 text-[9px] font-bold"
                                          title="Tiene retroalimentación del docente"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span className="flex items-center gap-1 text-[9px] text-zinc-400 font-semibold bg-zinc-800/60 px-1.5 py-0.5 rounded">
                                          <Calendar className="w-2.5 h-2.5 text-brand-purple" />
                                          {task.dueDate.split("-").slice(1).join("/")}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Title */}
                                  <h5 className="text-sm font-bold text-zinc-50 leading-snug line-clamp-2">
                                    {task.title}
                                  </h5>

                                  {/* Acceptance Criteria Progress Bar */}
                                  {(() => {
                                    const total = tasks.filter((t) => t.type === "RF" && t.parentHuId === task.id).length;
                                    const completed = tasks.filter((t) => t.type === "RF" && t.parentHuId === task.id && t.status === "Completado").length;
                                    const progressPercentage = total > 0 ? (completed / total) * 100 : 0;

                                    return (
                                      <div className="space-y-1 mt-auto">
                                        <div className="flex justify-between text-[9px] font-semibold text-zinc-500">
                                          <span>Criterios de Aceptación</span>
                                          <span>{completed}/{total}</span>
                                        </div>
                                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                          <div
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                              progressPercentage === 100
                                                ? "bg-emerald-500"
                                                : "bg-brand-purple"
                                            }`}
                                            style={{ width: `${progressPercentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Footer Row: Assignee + Actions */}
                                <div className="px-4 pb-3 flex items-center justify-between border-t border-zinc-800/60 pt-2.5">
                                  {task.assignedTo ? (
                                    <div
                                      className="flex items-center gap-1.5"
                                      title={`Asignado a: ${getStudentName(task.assignedTo)}`}
                                    >
                                      <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-700 flex items-center justify-center font-bold text-[9px]">
                                        {getStudentInitials(task.assignedTo)}
                                      </div>
                                      <span className="text-[10px] text-zinc-400 truncate max-w-[90px]">
                                        {getStudentName(task.assignedTo).split(" ")[0]}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-zinc-600 italic">Sin asignar</span>
                                  )}

                                  {/* Quick Move Controls */}
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
                                        className="p-1 hover:bg-zinc-800 border border-zinc-700/50 rounded text-zinc-500 hover:text-zinc-100 cursor-pointer transition-all"
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
                                        className="p-1 hover:bg-zinc-800 border border-zinc-700/50 rounded text-zinc-500 hover:text-zinc-100 cursor-pointer transition-all"
                                        title="Avanzar estado"
                                      >
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
          allTasks={tasks}
          onClose={() => setIsDetailOpen(false)}
          onRefreshTasks={loadBoardData}
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
