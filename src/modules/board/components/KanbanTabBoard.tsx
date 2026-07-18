import React from "react";
import { Task } from "../../shared/services/firebase";
import { CurrentUser } from "../../auth/hooks/useAuth";
import { Calendar, Edit2, MessageSquare } from "lucide-react";

export const KanbanColumns: { id: Task["status"]; label: string; color: string }[] = [
  { id: "Backlog", label: "Backlog", color: "border-t-brand-purple" },
  { id: "En Progreso", label: "En Progreso", color: "border-t-brand-blue" },
  { id: "En Revisión", label: "En Revisión", color: "border-t-brand-amber" },
  { id: "Completado", label: "Completado", color: "border-t-brand-emerald" },
];

interface KanbanTabBoardProps {
  filteredTasks: Task[];
  activeMobileCol: Task["status"];
  setActiveMobileCol: (col: Task["status"]) => void;
  currentUser: CurrentUser | null;
  dragOverCol: Task["status"] | null;
  setDragOverCol: (col: Task["status"] | null) => void;
  handleDragStart: (e: React.DragEvent, task: Task) => void;
  handleDragOver: (e: React.DragEvent, colId: Task["status"]) => void;
  handleDrop: (e: React.DragEvent, colId: Task["status"]) => void;
  handleDragEnd: () => void;
  handleOpenEdit: (task: Task) => void;
  getStudentName: (studentId: string | null) => string;
  getStudentInitials: (studentId: string | null) => string;
}

export const KanbanTabBoard: React.FC<KanbanTabBoardProps> = ({
  filteredTasks,
  activeMobileCol,
  setActiveMobileCol,
  currentUser,
  dragOverCol,
  setDragOverCol,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleOpenEdit,
  getStudentName,
  getStudentInitials
}) => {
  return (
    <>
      <div className="flex md:hidden bg-zinc-900/50 p-1 border border-white/5 rounded-xl mb-4">
        {KanbanColumns.map((col) => {
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {KanbanColumns.map((col) => {
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
              <div className={`p-4 border-t-2 ${col.color} bg-zinc-900/20 border-b border-zinc-800 flex items-center justify-between`}>
                <h3 className="font-bold text-zinc-50 text-xs tracking-wide uppercase">{col.label}</h3>
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-100 rounded-full font-bold text-[9px]">
                  {colTasks.length}
                </span>
              </div>

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
                        <div
                          className={`absolute top-0 left-0 right-0 h-[3px] ${
                            task.priority === "alta"
                              ? "bg-red-500 shadow-sm shadow-red-500/50"
                              : task.priority === "media"
                              ? "bg-amber-500 shadow-sm shadow-amber-500/50"
                              : "bg-blue-500 shadow-sm shadow-blue-500/50"
                          }`}
                        />

                        <div className="p-4 pt-5 flex flex-col gap-2.5 flex-1">
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
                                  className="flex items-center gap-1 bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold text-[9px]"
                                  title="Devuelto con feedback del docente"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </span>
                              )}
                              {task.dueDate ? (
                                <span className="flex items-center gap-1 text-[9px] font-medium text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                                  <Calendar className="w-2.5 h-2.5 text-brand-purple" />
                                  {task.dueDate.split("-").slice(1).join("-")}
                                </span>
                              ) : (
                                <span className="text-[9px] text-zinc-600 italic">Sin fecha</span>
                              )}
                            </div>
                          </div>

                          <h4 className="font-bold text-zinc-100 text-[11px] leading-tight line-clamp-2 group-hover:text-brand-purple transition-colors">
                            {task.title}
                          </h4>
                          <p className="text-[10px] text-zinc-500 leading-snug line-clamp-3">
                            {task.description}
                          </p>
                        </div>

                        <div className="p-3 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center mt-auto">
                          <div className="flex -space-x-1">
                            {task.assignedTo ? (
                              <div
                                className="w-5 h-5 rounded-full bg-brand-purple/20 border border-brand-purple/40 text-brand-purple flex items-center justify-center font-bold text-[8px] z-10"
                                title={`Asignado a: ${getStudentName(task.assignedTo)}`}
                              >
                                {getStudentInitials(task.assignedTo)}
                              </div>
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center font-bold text-[8px] z-10"
                                title="Sin asignar"
                              >
                                ?
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">Editar</span>
                            <div className="w-5 h-5 bg-zinc-800 hover:bg-brand-purple/20 hover:text-brand-purple text-zinc-400 rounded flex items-center justify-center transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </div>
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
  );
};
