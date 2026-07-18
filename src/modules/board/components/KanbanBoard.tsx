"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboard } from "../../shared/components/Layout";
import { useBoard, useTasksListener } from "../hooks/useBoard";
import { useKanbanDragAndDrop } from "../hooks/useKanbanDragAndDrop";
import { exportTasksToJson, parseImportedJson } from "../utils/jsonImporterExporter";
import { projectService, studentService, timeReportService, Student, Project, Task } from "../../shared/services/firebase";

import { CardDetailModal } from "./CardDetailModal";
import { FeedbackModal } from "./FeedbackModal";
import { TimeReportModal } from "./TimeReportModal";

import { AlertCircle, ClipboardList, FolderKanban, FileText } from "lucide-react";
import { toast } from "sonner";

import { BoardHeader } from "./BoardHeader";
import { KanbanTabDocument } from "./KanbanTabDocument";
import { KanbanTabBacklog } from "./KanbanTabBacklog";
import { KanbanTabBoard } from "./KanbanTabBoard";

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
  const [students, setStudents] = useState<Student[]>([]);
  
  const [activeTab, setActiveTab] = useState<"backlog" | "kanban" | "documento">("backlog");
  const [activeMobileCol, setActiveMobileCol] = useState<Task["status"]>("Backlog");
  const [searchTaskQuery, setSearchTaskQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<"ALL" | "alta" | "media" | "baja">("ALL");

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [taskPendingRejection, setTaskPendingRejection] = useState<Task | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<Task["status"] | null>(null);

  const [isTimeReportOpen, setIsTimeReportOpen] = useState(false);

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

  const isStudent = currentUser?.role === "estudiante";
  const myProject = isStudent ? projects.find((p) => p.members.includes(currentUser.id)) : null;
  const activeProject = isStudent ? myProject : projects.find((p) => p.id === selectedProjectId);

  // Auto-select my project if student
  useEffect(() => {
    if (isStudent && projects.length > 0) {
      if (myProject && selectedProjectId !== myProject.id) {
        setSelectedProjectId(myProject.id);
      } else if (!myProject && selectedProjectId) {
        setSelectedProjectId(null);
      }
    }
  }, [projects, currentUser, setSelectedProjectId, selectedProjectId, isStudent, myProject]);

  // Firebase Realtime Listener
  const { tasks, setTasks } = useTasksListener(
    selectedProjectId,
    isStudent,
    myProject?.id
  );

  // Filters
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
    
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, inKanban: true, status: "Backlog" } : t))
    );

    try {
      const success = await activateTaskInKanban(task, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });
      if (!success) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, inKanban: false } : t)));
      } else if (selectedProjectId) {
        const taskList = await loadTasks(selectedProjectId);
        setTasks(taskList);
      }
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, inKanban: false } : t)));
    }
  };

  const handleSaveCard = async (cardData: any) => {
    if (!selectedCourse || !selectedProjectId) return;
    if (selectedTask) {
      const success = await updateCardDetails(
        selectedTask, cardData.title, cardData.description, cardData.assignedTo,
        currentUser!.role, null, cardData.priority, cardData.dueType, cardData.dueDate, cardData.dueDays
      );
      if (success) loadBoardData();
    } else {
      const success = await createTask({
        projectId: selectedProjectId, courseId: selectedCourse.id,
        ...cardData, status: "Backlog", inKanban: false
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

  // Status transitions
  const handleMoveCard = async (task: Task, newStatus: Task["status"]) => {
    if (!activeProject || !currentUser) return;
    
    const requiresFeedback = task.status === "En Revisión" && (newStatus === "Backlog" || newStatus === "En Progreso");
    if (requiresFeedback) {
      setTaskPendingRejection(task);
      setPendingTargetStatus(newStatus);
      setIsFeedbackOpen(true);
      return;
    }

    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    const success = await transitionTask(
      task, newStatus,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      activeProject.members
    );
    if (!success) {
      setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  };

  const confirmRejection = async (feedbackText: string) => {
    if (!taskPendingRejection || !pendingTargetStatus || !activeProject || !currentUser) return;

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskPendingRejection.id ? { ...t, status: pendingTargetStatus } : t))
    );
    const success = await transitionTask(
      taskPendingRejection, pendingTargetStatus,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      activeProject.members,
      feedbackText
    );
    if (!success) {
      setTasks((prevTasks) => prevTasks.map((t) => (t.id === taskPendingRejection.id ? { ...t, status: taskPendingRejection.status } : t)));
    }
    
    setTaskPendingRejection(null);
    setPendingTargetStatus(null);
  };

  const { draggingTask, dragOverCol, setDragOverCol, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useKanbanDragAndDrop(
    tasks,
    handleMoveCard,
    isStudent
  );

  // Util helpers
  const getStudentName = (studentId: string | null) => {
    if (!studentId) return "Sin asignar";
    const s = students.find((s) => s.id === studentId);
    return s ? s.nombre_completo : "Desconocido";
  };

  const getStudentInitials = (studentId: string | null) => {
    if (!studentId) return "?";
    const s = students.find((st) => st.id === studentId);
    if (!s) return "?";
    return s.nombre_completo
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSaveTimeReport = async (hours: number, minutes: number, observation: string) => {
    if (!currentUser || !selectedCourse || !selectedProjectId) return;
    try {
      const requestedMinutes = (hours * 60) + minutes;
      
      // Validar máximo 4 horas por día
      const todayMinutes = await timeReportService.getTodayTimeSpentMinutes(currentUser.id);
      if (todayMinutes + requestedMinutes > 240) {
        const remainingMinutes = 240 - todayMinutes;
        if (remainingMinutes <= 0) {
          throw new Error("Ya has alcanzado el límite máximo de 4 horas de trabajo para hoy.");
        } else {
          const remH = Math.floor(remainingMinutes / 60);
          const remM = remainingMinutes % 60;
          throw new Error(`Solo te quedan ${remH}h ${remM}m disponibles para reportar hoy (límite de 4 horas/día).`);
        }
      }

      await timeReportService.createTimeReport({
        projectId: selectedProjectId,
        courseId: selectedCourse.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        timeSpentMinutes: (hours * 60) + minutes,
        observation: observation
      });
      toast.success("Tiempo reportado exitosamente.");
    } catch (e: any) {
      console.error(e);
      // Extraemos el mensaje de error si existe para lanzarlo hacia el TimeReportModal,
      // o usamos toast.error como fallback, o simplemente lanzamos para que el modal lo capture.
      throw new Error(e.message || "Error al reportar el tiempo.");
    }
  };

  return (
    <div className="space-y-6">
      <BoardHeader 
        activeProject={activeProject}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        currentUser={currentUser}
        activeTab={activeTab}
        handleFileChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !selectedCourse || !selectedProjectId) return;
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const text = event.target?.result;
              if (typeof text !== "string") return;
              const importedData = parseImportedJson(text, students);
              
              let importCount = 0;
              let criteriaCount = 0;
              for (const item of importedData) {
                const newHu = await createTask({
                  projectId: selectedProjectId, courseId: selectedCourse.id, type: "HU",
                  title: item.title, description: item.description, priority: item.priority,
                  status: item.status, inKanban: item.inKanban, assignedTo: item.assignedTo, dueDate: item.dueDate
                });
                if (newHu) {
                  importCount++;
                  for (const rf of item.criterios) {
                    await createTask({
                      projectId: selectedProjectId, courseId: selectedCourse.id, type: "RF",
                      parentHuId: newHu.id, title: rf.title, description: "", status: rf.status as any,
                      priority: "media", assignedTo: rf.assignedTo, inKanban: false
                    });
                    criteriaCount++;
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
        }}
        handleImportJson={() => document.getElementById("import-json-input")?.click()}
        handleExportJson={() => activeProject && exportTasksToJson(tasks, students, activeProject)}
        handleOpenCreate={handleOpenCreate}
        handleOpenTimeReport={isStudent ? () => setIsTimeReportOpen(true) : undefined}
      />

      {boardError && (
        <div className="p-3.5 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2.5 animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{boardError}</span>
        </div>
      )}

      {!selectedProjectId || !activeProject ? (
        <div className="p-12 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-zinc-400">
          {currentUser?.role === "estudiante"
            ? "No tienes ningún proyecto o grupo asignado en este curso. Por favor, solicita a tu docente que te asigne a un grupo."
            : "Por favor, selecciona un proyecto para visualizar el tablero de trabajo."}
        </div>
      ) : (
        <>
          {/* Main Board Nav Tabs */}
          <div className="flex gap-1 border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("backlog")}
              className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs border-b-2 transition-all ${
                activeTab === "backlog"
                  ? "border-brand-purple text-zinc-50 bg-brand-purple/5"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Backlog (Borradores)
            </button>
            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs border-b-2 transition-all ${
                activeTab === "kanban"
                  ? "border-brand-purple text-zinc-50 bg-brand-purple/5"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              Tablero Kanban
            </button>
            {(activeProject.construction?.introduction || activeProject.construction?.purpose || activeProject.construction?.objectives) && (
              <button
                onClick={() => setActiveTab("documento")}
                className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs border-b-2 transition-all ${
                  activeTab === "documento"
                    ? "border-brand-purple text-zinc-50 bg-brand-purple/5"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                <FileText className="w-4 h-4" />
                Documento
              </button>
            )}
          </div>

          <div className="mt-6">
            {activeTab === "documento" ? (
              <KanbanTabDocument activeProject={activeProject} />
            ) : activeTab === "backlog" ? (
              <KanbanTabBacklog 
                tasks={tasks}
                filteredTasks={filteredTasks}
                searchTaskQuery={searchTaskQuery}
                setSearchTaskQuery={setSearchTaskQuery}
                filterPriority={filterPriority}
                setFilterPriority={setFilterPriority}
                handleOpenEdit={handleOpenEdit}
                handleActivateTask={handleActivateTask}
                getStudentInitials={getStudentInitials}
                currentUser={currentUser}
              />
            ) : (
              <KanbanTabBoard 
                filteredTasks={filteredTasks}
                activeMobileCol={activeMobileCol}
                setActiveMobileCol={setActiveMobileCol}
                currentUser={currentUser}
                dragOverCol={dragOverCol}
                setDragOverCol={setDragOverCol}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                handleOpenEdit={handleOpenEdit}
                getStudentName={getStudentName}
                getStudentInitials={getStudentInitials}
              />
            )}
          </div>
        </>
      )}

      {isDetailOpen && (
        <CardDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          task={selectedTask}
          onSave={handleSaveCard}
          onDelete={selectedTask ? () => handleDeleteCard(selectedTask.id) : undefined}
          projectId={selectedProjectId!}
          courseId={selectedCourse!.id}
          projectMembers={activeProject ? activeProject.members : []}
          allTasks={tasks}
        />
      )}

      {isFeedbackOpen && taskPendingRejection && (
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => {
            setIsFeedbackOpen(false);
            setTaskPendingRejection(null);
            setPendingTargetStatus(null);
          }}
          onConfirm={confirmRejection}
          cardTitle={taskPendingRejection.title}
        />
      )}

      {isTimeReportOpen && (
        <TimeReportModal
          isOpen={isTimeReportOpen}
          onClose={() => setIsTimeReportOpen(false)}
          onSave={handleSaveTimeReport}
        />
      )}
    </div>
  );
};
