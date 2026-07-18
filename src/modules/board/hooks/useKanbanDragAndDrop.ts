import { useState } from "react";
import { Task } from "../../shared/services/firebase";

export const useKanbanDragAndDrop = (
  tasks: Task[],
  handleMoveCard: (task: Task, newStatus: Task["status"]) => Promise<void>,
  isStudent: boolean
) => {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Task["status"] | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    // Si la tarjeta está "En Revisión" y el usuario es estudiante, está congelada
    const isFrozen = task.status === "En Revisión" && isStudent;
    if (isFrozen) {
      e.preventDefault();
      return;
    }
    setDraggingTask(task);
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
    
    const taskId = e.dataTransfer.getData("text/plain");
    const taskToMove = tasks.find((t) => t.id === (taskId || (draggingTask && draggingTask.id)));
    
    if (!taskToMove) return;
    if (taskToMove.status === colId) return;

    await handleMoveCard(taskToMove, colId);
  };

  return {
    draggingTask,
    dragOverCol,
    setDragOverCol,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  };
};
