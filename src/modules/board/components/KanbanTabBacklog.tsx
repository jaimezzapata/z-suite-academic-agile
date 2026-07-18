import React from "react";
import { Task } from "../../shared/services/firebase";
import { CurrentUser } from "../../auth/hooks/useAuth";
import { Calendar, ArrowRight } from "lucide-react";

interface KanbanTabBacklogProps {
  tasks: Task[];
  filteredTasks: Task[];
  searchTaskQuery: string;
  setSearchTaskQuery: (query: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: any) => void;
  handleOpenEdit: (task: Task) => void;
  handleActivateTask: (task: Task) => void;
  getStudentInitials: (studentId: string | null) => string;
  currentUser: CurrentUser | null;
}

export const KanbanTabBacklog: React.FC<KanbanTabBacklogProps> = ({
  tasks,
  filteredTasks,
  searchTaskQuery,
  setSearchTaskQuery,
  filterPriority,
  setFilterPriority,
  handleOpenEdit,
  handleActivateTask,
  getStudentInitials,
  currentUser
}) => {
  return (
    <div className="space-y-4">
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
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs bg-zinc-950 border border-white/5 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple cursor-pointer w-full sm:w-auto"
          >
            <option value="ALL">Todas las Prioridades</option>
            <option value="alta">Prioridad Alta</option>
            <option value="media">Prioridad Media</option>
            <option value="baja">Prioridad Baja</option>
          </select>
        </div>
      </div>

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

                <div className="space-y-2.5 pt-2 border-t border-zinc-800/40 mt-3">
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

                  <div className="flex items-center justify-between pt-1 text-[9px]">
                    {task.dueDate ? (
                      <span className="flex items-center gap-0.5 text-zinc-500 dark:text-gray-400 font-medium">
                        <Calendar className="w-2.5 h-2.5 text-brand-purple" />
                        {task.dueDate.split("-").slice(1).join("-")}
                      </span>
                    ) : (
                      <span className="text-zinc-600 italic">Sin fecha</span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 hidden sm:inline">Resp:</span>
                      <div
                        className="w-5 h-5 rounded-full bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-[8px] font-bold text-brand-purple"
                        title={task.assignedTo ? "Ver asignado en edición" : "Sin asignar"}
                      >
                        {getStudentInitials(task.assignedTo)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acción de Mover al Kanban */}
                {!isTaskInKanban && (
                  <button
                    onClick={() => handleActivateTask(task)}
                    className="absolute bottom-2 right-2 p-1.5 bg-brand-purple hover:bg-brand-purple/80 text-white rounded-lg shadow-md transition-all group"
                    title="Mover a Kanban (Activar)"
                  >
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
