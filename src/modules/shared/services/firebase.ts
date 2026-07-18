import { db } from "../../../../sdk-firebase";
export { db };

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction,
  writeBatch,
  addDoc,
  orderBy,
  deleteDoc
} from "firebase/firestore";

// ==========================================
// 1. SERVICIOS DE CURSOS
// ==========================================

export interface Course {
  id: string;
  name: string;
  sede: string;
  dia: string;
  horario: string;
  fechaInicio: string;
  fechaFin: string;
  inscriptionsStatus: "open" | "closed";
  createdAt: string;
  fecha?: string;
  hora?: string;
}

export const courseService = {
  async getCourses(): Promise<Course[]> {
    const querySnapshot = await getDocs(collection(db, "courses"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Course[];
  },

  async createCourse(
    name: string,
    sede: string,
    dia: string,
    horario: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<Course> {
    const newCourse: Course = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      sede,
      dia,
      horario,
      fechaInicio,
      fechaFin,
      inscriptionsStatus: "open",
      createdAt: new Date().toISOString(),
      fecha: fechaInicio,
      hora: horario,
    };
    await setDoc(doc(db, "courses", newCourse.id), newCourse);
    return newCourse;
  },

  async updateCourse(courseId: string, updatedFields: Partial<Course>): Promise<void> {
    await updateDoc(doc(db, "courses", courseId), updatedFields);
  },

  async deleteCourse(courseId: string): Promise<void> {
    const batch = writeBatch(db);

    // Eliminar estudiantes del curso
    const studentsQuery = query(collection(db, "students"), where("courseId", "==", courseId));
    const studentsSnap = await getDocs(studentsQuery);
    studentsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Eliminar proyectos del curso
    const projectsQuery = query(collection(db, "projects"), where("courseId", "==", courseId));
    const projectsSnap = await getDocs(projectsQuery);
    projectsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Eliminar curso
    batch.delete(doc(db, "courses", courseId));
    await batch.commit();
  },

  async updateInscriptionsStatus(courseId: string, status: "open" | "closed"): Promise<void> {
    await updateDoc(doc(db, "courses", courseId), { inscriptionsStatus: status });
  },
};

// ==========================================
// 2. SERVICIOS DE ESTUDIANTES
// ==========================================

export interface Student {
  id: string;
  nombre_completo: string;
  correo_institucional: string;
  codigo_estudiante: string;
  courseId: string | null;
  projectId: string | null;
  role: "estudiante";
  telefono?: string;
}

export const studentService = {
  async getStudents(courseId?: string): Promise<Student[]> {
    let q = query(collection(db, "students"));
    if (courseId) {
      q = query(collection(db, "students"), where("courseId", "==", courseId));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Student[];
  },

  async createStudent(student: Omit<Student, "role">): Promise<Student> {
    const fullStudent: Student = {
      ...student,
      role: "estudiante",
    };
    await setDoc(doc(db, "students", fullStudent.id), fullStudent);
    return fullStudent;
  },

  async importStudents(students: Omit<Student, "role" | "projectId">[]): Promise<void> {
    const batch = writeBatch(db);
    for (const student of students) {
      const studentDocRef = doc(db, "students", student.id);
      const studentSnap = await getDoc(studentDocRef);

      if (studentSnap.exists()) {
        const existingData = studentSnap.data();
        // Si el estudiante ya pertenece a OTRO curso, lo saltamos sin bloquear a los demás
        if (existingData.courseId !== student.courseId) {
          continue;
        }
        
        // Si ya pertenece a este mismo curso, lo actualizamos pero conservamos su grupo actual si tiene
        batch.set(studentDocRef, {
          ...student,
          projectId: existingData.projectId || null,
          role: "estudiante",
        }, { merge: true });
      } else {
        // Es un estudiante nuevo
        batch.set(studentDocRef, {
          ...student,
          projectId: null,
          role: "estudiante",
        });
      }
    }
    await batch.commit();
  },

  async updateStudentProject(studentId: string, projectId: string | null): Promise<void> {
    await updateDoc(doc(db, "students", studentId), { projectId });
  },

  async deleteStudent(studentId: string): Promise<void> {
    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      if (data.projectId) {
        const projectRef = doc(db, "projects", data.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const pData = projectSnap.data();
          const filtered = (pData.members || []).filter((id: string) => id !== studentId);
          await updateDoc(projectRef, { members: filtered });
        }
      }
    }
    await deleteDoc(studentRef);
  },

  async updateStudent(studentId: string, updatedFields: Partial<Student>): Promise<void> {
    await updateDoc(doc(db, "students", studentId), updatedFields);
  },

  async deleteAllStudentsFromCourse(courseId: string): Promise<void> {
    // Primero, desasignarlos de los proyectos (limpia tareas y projects.members)
    await projectService.unenrollAllFromCourse(courseId);

    // Luego, eliminar los documentos de los estudiantes
    const qStudents = query(collection(db, "students"), where("courseId", "==", courseId));
    const snapStudents = await getDocs(qStudents);
    
    const batch = writeBatch(db);
    snapStudents.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
};

// ==========================================
// 3. SERVICIOS DE PROYECTOS
// ==========================================

export interface Project {
  id: string;
  courseId: string;
  name: string;
  max_members: number;
  members: string[]; // Listado de studentIds
  deadline?: string; // Fecha límite de entrega
  construction?: {
    introduction?: string;
    purpose?: string;
    objectives?: string;
  };
}

export const projectService = {
  async getProjects(courseId: string): Promise<Project[]> {
    const q = query(collection(db, "projects"), where("courseId", "==", courseId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
  },

  async createProject(courseId: string, name: string, maxMembers = 4, deadline?: string): Promise<Project> {
    const newProject: Project = {
      id: Math.random().toString(36).substring(2, 11),
      courseId,
      name,
      max_members: maxMembers,
      members: [],
      deadline: deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 semanas por defecto
    };
    await setDoc(doc(db, "projects", newProject.id), newProject);
    return newProject;
  },

  async updateProjectMaxMembers(projectId: string, maxMembers: number): Promise<void> {
    await updateDoc(doc(db, "projects", projectId), { max_members: maxMembers });
  },

  async updateProjectDeadline(projectId: string, deadline: string): Promise<void> {
    await updateDoc(doc(db, "projects", projectId), { deadline });
  },

  async updateProjectConstruction(projectId: string, construction: { introduction?: string; purpose?: string; objectives?: string; }): Promise<void> {
    await updateDoc(doc(db, "projects", projectId), { construction });
  },

  // Transacción atómica para auto-inscripción
  async joinProject(studentId: string, projectId: string): Promise<void> {
    const studentDocRef = doc(db, "students", studentId);
    const projectDocRef = doc(db, "projects", projectId);

    await runTransaction(db, async (transaction) => {
      const studentDoc = await transaction.get(studentDocRef);
      const projectDoc = await transaction.get(projectDocRef);

      if (!studentDoc.exists()) throw new Error("El estudiante no existe.");
      if (!projectDoc.exists()) throw new Error("El proyecto no existe.");

      const studentData = studentDoc.data();
      const projectData = projectDoc.data();

      if (studentData.projectId) {
        throw new Error("El estudiante ya pertenece a un proyecto.");
      }

      const currentMembers = projectData.members || [];
      const maxMembers = projectData.max_members || 4;

      if (currentMembers.length >= maxMembers) {
        throw new Error("El proyecto ya se encuentra lleno.");
      }

      // Realizar actualizaciones
      transaction.update(studentDocRef, { projectId });
      transaction.update(projectDocRef, {
        members: [...currentMembers, studentId],
      });
    });
  },

  // Operación para reubicar estudiante (Docente manual)
  async moveStudentToProject(studentId: string, targetProjectId: string | null, sourceProjectId: string | null): Promise<void> {
    const batch = writeBatch(db);
    
    // Quitar de proyecto origen
    if (sourceProjectId) {
      const sourceProjRef = doc(db, "projects", sourceProjectId);
      const sourceProjSnap = await getDocs(query(collection(db, "projects"), where("id", "==", sourceProjectId)));
      if (!sourceProjSnap.empty) {
        const data = sourceProjSnap.docs[0].data();
        const filteredMembers = (data.members || []).filter((id: string) => id !== studentId);
        batch.update(sourceProjRef, { members: filteredMembers });
      }

      // Limpiar tareas (HU/RF) asignadas a este estudiante en el proyecto anterior
      const qTasks = query(collection(db, "tasks"), where("projectId", "==", sourceProjectId), where("assignedTo", "==", studentId));
      const snapTasks = await getDocs(qTasks);
      snapTasks.docs.forEach((tDoc) => {
        batch.update(tDoc.ref, { assignedTo: null });
      });
    }

    // Agregar a proyecto destino
    if (targetProjectId) {
      const targetProjRef = doc(db, "projects", targetProjectId);
      const targetProjSnap = await getDocs(query(collection(db, "projects"), where("id", "==", targetProjectId)));
      if (!targetProjSnap.empty) {
        const data = targetProjSnap.docs[0].data();
        const currentMembers = data.members || [];
        batch.update(targetProjRef, { members: [...currentMembers, studentId] });
      }
    }

    // Actualizar estudiante
    const studentRef = doc(db, "students", studentId);
    batch.update(studentRef, { projectId: targetProjectId });

    await batch.commit();
  },

  // Algoritmo de auto-completado aleatorio ( Fisher-Yates )
  async autoCompleteInscriptions(courseId: string, laggingStudents: Student[], availableSlots: { projectId: string }[]): Promise<void> {
    const batch = writeBatch(db);

    // Desordenar rezagados usando Fisher-Yates
    const shuffledStudents = [...laggingStudents];
    for (let i = shuffledStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
    }

    // Mapeo 1:1 de estudiantes a cupos
    const assignments: { studentId: string; projectId: string }[] = [];
    shuffledStudents.forEach((student, index) => {
      if (index < availableSlots.length) {
        assignments.push({
          studentId: student.id,
          projectId: availableSlots[index].projectId,
        });
      }
    });

    // Agrupar cambios en proyectos
    const projectUpdates: { [projectId: string]: string[] } = {};
    assignments.forEach((asg) => {
      if (!projectUpdates[asg.projectId]) {
        projectUpdates[asg.projectId] = [];
      }
      projectUpdates[asg.projectId].push(asg.studentId);
    });

    // Escribir en Firestore
    for (const [projId, newStudentIds] of Object.entries(projectUpdates)) {
      const projDocRef = doc(db, "projects", projId);
      const projDocSnap = await getDocs(query(collection(db, "projects"), where("id", "==", projId)));
      if (!projDocSnap.empty) {
        const data = projDocSnap.docs[0].data();
        const currentMembers = data.members || [];
        batch.update(projDocRef, { members: [...currentMembers, ...newStudentIds] });
      }
    }

    assignments.forEach((asg) => {
      const studentDocRef = doc(db, "students", asg.studentId);
      batch.update(studentDocRef, { projectId: asg.projectId });
    });

    // Cerrar curso
    const courseDocRef = doc(db, "courses", courseId);
    batch.update(courseDocRef, { inscriptionsStatus: "closed" });

    await batch.commit();
  },

  async deleteProject(projectId: string): Promise<void> {
    const q = query(collection(db, "students"), where("projectId", "==", projectId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { projectId: null });
    });
    batch.delete(doc(db, "projects", projectId));
    await batch.commit();
  },

  async updateProject(projectId: string, name: string, maxMembers: number): Promise<void> {
    await updateDoc(doc(db, "projects", projectId), { name, max_members: maxMembers });
  },

  async unenrollAllFromProject(projectId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // 1. Vaciar miembros del proyecto
    const projRef = doc(db, "projects", projectId);
    batch.update(projRef, { members: [] });

    // 2. Quitar projectId a todos los estudiantes que pertenezcan al proyecto
    const q = query(collection(db, "students"), where("projectId", "==", projectId));
    const snap = await getDocs(q);
    snap.docs.forEach((studentDoc) => {
      batch.update(studentDoc.ref, { projectId: null });
    });

    // 3. Limpiar asignaciones de tareas (HU/RF) en el proyecto
    const qTasks = query(collection(db, "tasks"), where("projectId", "==", projectId));
    const snapTasks = await getDocs(qTasks);
    snapTasks.docs.forEach((tDoc) => {
      batch.update(tDoc.ref, { assignedTo: null });
    });

    await batch.commit();
  },

  async unenrollAllFromCourse(courseId: string): Promise<void> {
    const batch = writeBatch(db);

    // 1. Vaciar miembros de todos los proyectos de este curso
    const qProjects = query(collection(db, "projects"), where("courseId", "==", courseId));
    const snapProjects = await getDocs(qProjects);
    snapProjects.docs.forEach((projDoc) => {
      batch.update(projDoc.ref, { members: [] });
    });

    // 2. Quitar projectId a todos los estudiantes de este curso que tengan un proyecto asignado
    const qStudents = query(collection(db, "students"), where("courseId", "==", courseId));
    const snapStudents = await getDocs(qStudents);
    snapStudents.docs.forEach((studentDoc) => {
      const studentData = studentDoc.data();
      if (studentData.projectId) {
         batch.update(studentDoc.ref, { projectId: null });
      }
    });

    // 3. Limpiar asignaciones de tareas en todos los proyectos de este curso
    const qTasks = query(collection(db, "tasks"), where("courseId", "==", courseId));
    const snapTasks = await getDocs(qTasks);
    snapTasks.docs.forEach((tDoc) => {
      if (tDoc.data().assignedTo !== null) {
        batch.update(tDoc.ref, { assignedTo: null });
      }
    });

    await batch.commit();
  },
};

// ==========================================
// 4. SERVICIOS DE TABLERO (KANBAN)
// ==========================================

export interface Task {
  id: string;
  projectId: string;
  courseId: string;
  type: "HU" | "RF";
  title: string;
  description: string;
  status: "Backlog" | "En Progreso" | "En Revisión" | "Completado";
  assignedTo: string | null; // StudentId
  feedback_docente: string | null;
  createdAt: string;
  progressAt?: string | null;
  revisionAt?: string | null;
  completedAt?: string | null;
  inKanban?: boolean;
  parentHuId?: string | null;
  priority?: "alta" | "media" | "baja";
  dueType?: "date" | "days";
  dueDate?: string;
  dueDays?: number;
}

export interface ActivityLog {
  id: string;
  courseId: string;
  projectId: string;
  task_id: string;
  task_title?: string;
  user_id: string;
  user_name: string;
  previous_status: string;
  new_status: string;
  timestamp: string;
  comment?: string | null;
  /** Tipo de entrada: 'move' = cambio de estado, 'comment' = observación libre,
   *  'return' = devolución docente con feedback, 'criteria' = cambio en criterio */
  type?: "move" | "comment" | "return" | "criteria";
}

export const boardService = {
  async getTasks(projectId: string): Promise<Task[]> {
    const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
  },

  async createTask(task: Omit<Task, "id" | "createdAt" | "feedback_docente">): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substring(2, 11),
      feedback_docente: null,
      createdAt: new Date().toISOString(),
      progressAt: null,
      revisionAt: null,
      completedAt: null,
    };
    await setDoc(doc(db, "tasks", newTask.id), newTask);
    return newTask;
  },

  async updateTask(taskId: string, taskUpdates: Partial<Task>): Promise<void> {
    await updateDoc(doc(db, "tasks", taskId), taskUpdates as any);
  },

  async deleteTask(taskId: string): Promise<void> {
    await deleteDoc(doc(db, "tasks", taskId));
  },

  async wipeProjectTasksAndMetrics(projectId: string): Promise<void> {
    const batch = writeBatch(db);

    // 1. Obtener y eliminar todas las tareas (HUs y RFs)
    const qTasks = query(collection(db, "tasks"), where("projectId", "==", projectId));
    const snapTasks = await getDocs(qTasks);
    snapTasks.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    // 2. Obtener y eliminar todos los activity logs
    const qLogs = query(collection(db, "activity_logs"), where("projectId", "==", projectId));
    const snapLogs = await getDocs(qLogs);
    snapLogs.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    // 3. Obtener y eliminar todos los time reports
    const qTime = query(collection(db, "time_reports"), where("projectId", "==", projectId));
    const snapTime = await getDocs(qTime);
    snapTime.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
  },

  async createActivityLog(log: Omit<ActivityLog, "id" | "timestamp">): Promise<ActivityLog> {
    const newLog: ActivityLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };
    await addDoc(collection(db, "activity_logs"), newLog);
    return newLog;
  },

  async getActivityLogs(courseId: string, projectId?: string): Promise<ActivityLog[]> {
    let q = query(
      collection(db, "activity_logs"),
      where("courseId", "==", courseId)
    );
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ActivityLog[];
    
    // Ordenar en memoria (descendente por timestamp) para evitar el requisito de índice compuesto en Firestore
    const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return projectId ? sortedLogs.filter((l) => l.projectId === projectId) : sortedLogs;
  },
};

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  code: string;
  role: "admin" | "docente";
}

export const userService = {
  async getUsers(role?: "admin" | "docente"): Promise<UserAccount[]> {
    let q = query(collection(db, "users"));
    if (role) {
      q = query(collection(db, "users"), where("role", "==", role));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserAccount[];
  },
  async createUser(user: UserAccount): Promise<UserAccount> {
    await setDoc(doc(db, "users", user.email), user);
    return user;
  }
};

// ==========================================
// 6. SERVICIOS DE REPORTE DE TIEMPOS
// ==========================================

export interface TimeReport {
  id: string;
  projectId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  timeSpentMinutes: number;
  observation: string;
  timestamp: string;
}

export const timeReportService = {
  async createTimeReport(report: Omit<TimeReport, "id" | "timestamp">): Promise<TimeReport> {
    const newReport: TimeReport = {
      ...report,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };
    await addDoc(collection(db, "time_reports"), newReport);
    return newReport;
  },

  async getTimeReportsByProject(projectId: string): Promise<TimeReport[]> {
    const q = query(collection(db, "time_reports"), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TimeReport[];
  },

  async getTodayTimeSpentMinutes(studentId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Inicio del día

    // La consulta se hace filtrando localmente el timestamp ya que no tenemos índice compuesto, 
    // pero idealmente deberíamos tener una consulta simple.
    // Usaremos studentId y filtraremos por fecha en el cliente por ser pocos registros.
    const q = query(collection(db, "time_reports"), where("studentId", "==", studentId));
    const querySnapshot = await getDocs(q);
    
    let totalMinutes = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data() as TimeReport;
      if (new Date(data.timestamp) >= today) {
        totalMinutes += data.timeSpentMinutes;
      }
    });
    
    return totalMinutes;
  }
};
