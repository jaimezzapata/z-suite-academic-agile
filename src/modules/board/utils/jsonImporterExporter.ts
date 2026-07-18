import { Task, Student, Project } from "../../shared/services/firebase";

export const exportTasksToJson = (
  tasks: Task[],
  students: Student[],
  activeProject: Project
) => {
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

export interface ParsedHU {
  title: string;
  description: string;
  priority: "alta" | "media" | "baja";
  status: Task["status"];
  inKanban: boolean;
  assignedTo: string | null;
  dueDate: string;
  criterios: {
    title: string;
    status: string;
    assignedTo: string | null;
  }[];
}

export const parseImportedJson = (text: string, students: Student[]): ParsedHU[] => {
  const importedData = JSON.parse(text);
  if (!Array.isArray(importedData)) {
    throw new Error("El archivo JSON debe ser una lista de Historias de Usuario.");
  }
  
  return importedData.map((item: any) => {
    let assignedToId: string | null = null;
    if (item.assignedTo) {
      const s = students.find(
        (st) => st.correo_institucional === item.assignedTo || st.nombre_completo === item.assignedTo || st.id === item.assignedTo
      );
      if (s) assignedToId = s.id;
    }

    const criterios = Array.isArray(item.criterios) ? item.criterios.map((rf: any) => {
      let rfAssignedToId: string | null = null;
      if (rf.assignedTo) {
        const s = students.find(
          (st) => st.correo_institucional === rf.assignedTo || st.nombre_completo === rf.assignedTo || st.id === rf.assignedTo
        );
        if (s) rfAssignedToId = s.id;
      }
      return { 
        title: rf.title || "Sin título",
        status: rf.status || "Pendiente", 
        assignedTo: rfAssignedToId 
      };
    }) : [];

    return {
      title: item.title || "Sin título",
      description: item.description || "",
      priority: item.priority || "media",
      status: item.status || "Backlog",
      inKanban: item.inKanban !== undefined ? item.inKanban : false,
      assignedTo: assignedToId,
      dueDate: item.dueDate || "",
      criterios
    };
  });
};
