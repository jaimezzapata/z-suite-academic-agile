import { db } from "../../../../sdk-firebase";
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
  Timestamp,
  deleteDoc
} from "firebase/firestore";

// Tipo para el estado de la base de datos
export type DBMode = "firestore" | "local";

// Estado global para detectar el modo de base de datos
let currentMode: DBMode = "firestore";
let modeListeners: ((mode: DBMode) => void)[] = [];

export function subscribeToDBMode(listener: (mode: DBMode) => void) {
  modeListeners.push(listener);
  listener(currentMode);
  return () => {
    modeListeners = modeListeners.filter((l) => l !== listener);
  };
}

function setDBMode(mode: DBMode) {
  if (currentMode !== mode) {
    currentMode = mode;
    modeListeners.forEach((l) => l(mode));
    console.warn(`[DB] Cambiando a modo de base de datos: ${mode.toUpperCase()}`);
  }
}

export function getDBMode(): DBMode {
  return currentMode;
}

// Inicialización de datos locales en LocalStorage si no existen
const LOCAL_STORAGE_KEY = "academic_agile_db";

interface LocalDB {
  courses: any[];
  students: any[];
  projects: any[];
  tasks: any[];
  activity_logs: any[];
  users: any[];
}

function getLocalDB(): LocalDB {
  if (typeof window === "undefined") {
    return { courses: [], students: [], projects: [], tasks: [], activity_logs: [], users: [] };
  }
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const initial: LocalDB = {
      courses: [],
      students: [],
      projects: [],
      tasks: [],
      activity_logs: [],
      users: [
        {
          id: "zapataval2304@gmail.com",
          email: "zapataval2304@gmail.com",
          name: "Jaime Zapata",
          code: "admin123",
          role: "admin"
        }
      ]
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = [];
    
    // Si no contiene el admin, lo agregamos para facilitar testing offline
    const adminEmail = "zapataval2304@gmail.com";
    if (!parsed.users.some((u: any) => u.email === adminEmail)) {
      parsed.users.push({
        id: adminEmail,
        email: adminEmail,
        name: "Jaime Zapata",
        code: "admin123",
        role: "admin"
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    const initial: LocalDB = {
      courses: [],
      students: [],
      projects: [],
      tasks: [],
      activity_logs: [],
      users: [
        {
          id: "zapataval2304@gmail.com",
          email: "zapataval2304@gmail.com",
          name: "Jaime Zapata",
          code: "admin123",
          role: "admin"
        }
      ]
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveLocalDB(dbData: LocalDB) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbData));
  }
}

// Helper para intentar ejecutar operaciones de Firestore y conmutar a LocalStorage en caso de error
async function exec<T>(firestoreOp: () => Promise<T>, localOp: () => T): Promise<T> {
  if (currentMode === "local") {
    return localOp();
  }
  try {
    return await firestoreOp();
  } catch (error: any) {
    console.error("Error en Firestore, activando fallback local:", error);
    setDBMode("local");
    return localOp();
  }
}

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
    return exec(
      async () => {
        const querySnapshot = await getDocs(collection(db, "courses"));
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Course[];
      },
      () => {
        return getLocalDB().courses;
      }
    );
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
      // Fallbacks para evitar errores si algo dependía de ellos
      fecha: fechaInicio,
      hora: horario,
    };
    return exec(
      async () => {
        await setDoc(doc(db, "courses", newCourse.id), newCourse);
        return newCourse;
      },
      () => {
        const local = getLocalDB();
        local.courses.push(newCourse);
        saveLocalDB(local);
        return newCourse;
      }
    );
  },

  async updateCourse(courseId: string, updatedFields: Partial<Course>): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "courses", courseId), updatedFields);
      },
      () => {
        const local = getLocalDB();
        const course = local.courses.find((c) => c.id === courseId);
        if (course) {
          Object.assign(course, updatedFields);
          saveLocalDB(local);
        }
      }
    );
  },

  async deleteCourse(courseId: string): Promise<void> {
    return exec(
      async () => {
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
      () => {
        const local = getLocalDB();
        local.students = local.students.filter((s) => s.courseId !== courseId);
        local.projects = local.projects.filter((p) => p.courseId !== courseId);
        local.courses = local.courses.filter((c) => c.id !== courseId);
        saveLocalDB(local);
      }
    );
  },

  async updateInscriptionsStatus(courseId: string, status: "open" | "closed"): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "courses", courseId), { inscriptionsStatus: status });
      },
      () => {
        const local = getLocalDB();
        const course = local.courses.find((c) => c.id === courseId);
        if (course) {
          course.inscriptionsStatus = status;
          saveLocalDB(local);
        }
      }
    );
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
    return exec(
      async () => {
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
      () => {
        const students = getLocalDB().students;
        return courseId ? students.filter((s) => s.courseId === courseId) : students;
      }
    );
  },

  async createStudent(student: Omit<Student, "role">): Promise<Student> {
    const fullStudent: Student = {
      ...student,
      role: "estudiante",
    };
    return exec(
      async () => {
        await setDoc(doc(db, "students", fullStudent.id), fullStudent);
        return fullStudent;
      },
      () => {
        const local = getLocalDB();
        // Verificar correo único a nivel local
        const exists = local.students.some(
          (s) => s.correo_institucional.toLowerCase() === student.correo_institucional.toLowerCase()
        );
        if (exists) {
          throw new Error(`El correo ${student.correo_institucional} ya está registrado en otro curso.`);
        }
        local.students.push(fullStudent);
        saveLocalDB(local);
        return fullStudent;
      }
    );
  },

  async importStudents(students: Omit<Student, "role" | "projectId">[]): Promise<void> {
    return exec(
      async () => {
        const batch = writeBatch(db);
        students.forEach((student) => {
          const studentDocRef = doc(db, "students", student.id);
          batch.set(studentDocRef, {
            ...student,
            projectId: null,
            role: "estudiante",
          });
        });
        await batch.commit();
      },
      () => {
        const local = getLocalDB();
        // Validar unicidad de correo institucional
        for (const s of students) {
          const exists = local.students.some(
            (existing) =>
              existing.correo_institucional.toLowerCase() === s.correo_institucional.toLowerCase() &&
              existing.courseId !== s.courseId
          );
          if (exists) {
            throw new Error(`El estudiante con correo ${s.correo_institucional} ya existe en otro curso.`);
          }
        }
        // Insertar o actualizar
        students.forEach((student) => {
          const index = local.students.findIndex((s) => s.id === student.id);
          const full: Student = { ...student, projectId: null, role: "estudiante" };
          if (index >= 0) {
            local.students[index] = full;
          } else {
            local.students.push(full);
          }
        });
        saveLocalDB(local);
      }
    );
  },

  async updateStudentProject(studentId: string, projectId: string | null): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "students", studentId), { projectId });
      },
      () => {
        const local = getLocalDB();
        const student = local.students.find((s) => s.id === studentId);
        if (student) {
          student.projectId = projectId;
          saveLocalDB(local);
        }
      }
    );
  },

  async deleteStudent(studentId: string): Promise<void> {
    return exec(
      async () => {
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
      () => {
        const local = getLocalDB();
        const student = local.students.find((s) => s.id === studentId);
        if (student && student.projectId) {
          const p = local.projects.find((proj) => proj.id === student.projectId);
          if (p) {
            p.members = p.members.filter((id: string) => id !== studentId);
          }
        }
        local.students = local.students.filter((s) => s.id !== studentId);
        saveLocalDB(local);
      }
    );
  },

  async updateStudent(studentId: string, updatedFields: Partial<Student>): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "students", studentId), updatedFields);
      },
      () => {
        const local = getLocalDB();
        const student = local.students.find((s) => s.id === studentId);
        if (student) {
          Object.assign(student, updatedFields);
          saveLocalDB(local);
        }
      }
    );
  },
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
}

export const projectService = {
  async getProjects(courseId: string): Promise<Project[]> {
    return exec(
      async () => {
        const q = query(collection(db, "projects"), where("courseId", "==", courseId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];
      },
      () => {
        return getLocalDB().projects.filter((p) => p.courseId === courseId);
      }
    );
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
    return exec(
      async () => {
        await setDoc(doc(db, "projects", newProject.id), newProject);
        return newProject;
      },
      () => {
        const local = getLocalDB();
        local.projects.push(newProject);
        saveLocalDB(local);
        return newProject;
      }
    );
  },

  async updateProjectMaxMembers(projectId: string, maxMembers: number): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "projects", projectId), { max_members: maxMembers });
      },
      () => {
        const local = getLocalDB();
        const p = local.projects.find((proj) => proj.id === projectId);
        if (p) {
          p.max_members = maxMembers;
          saveLocalDB(local);
        }
      }
    );
  },

  async updateProjectDeadline(projectId: string, deadline: string): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "projects", projectId), { deadline });
      },
      () => {
        const local = getLocalDB();
        const p = local.projects.find((proj) => proj.id === projectId);
        if (p) {
          p.deadline = deadline;
          saveLocalDB(local);
        }
      }
    );
  },

  // Transacción atómica para auto-inscripción
  async joinProject(studentId: string, projectId: string): Promise<void> {
    return exec(
      async () => {
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
      () => {
        const local = getLocalDB();
        const student = local.students.find((s) => s.id === studentId);
        const project = local.projects.find((p) => p.id === projectId);

        if (!student) throw new Error("El estudiante no existe.");
        if (!project) throw new Error("El proyecto no existe.");

        if (student.projectId) {
          throw new Error("El estudiante ya pertenece a un proyecto.");
        }

        if (project.members.length >= project.max_members) {
          throw new Error("El proyecto ya se encuentra lleno.");
        }

        student.projectId = projectId;
        project.members.push(studentId);
        saveLocalDB(local);
      }
    );
  },

  // Operación para reubicar estudiante (Docente manual)
  async moveStudentToProject(studentId: string, targetProjectId: string | null, sourceProjectId: string | null): Promise<void> {
    return exec(
      async () => {
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
      () => {
        const local = getLocalDB();
        
        if (sourceProjectId) {
          const sourceProj = local.projects.find((p) => p.id === sourceProjectId);
          if (sourceProj) {
            sourceProj.members = sourceProj.members.filter((id: string) => id !== studentId);
          }
        }

        if (targetProjectId) {
          const targetProj = local.projects.find((p) => p.id === targetProjectId);
          if (targetProj) {
            targetProj.members.push(studentId);
          }
        }

        const student = local.students.find((s) => s.id === studentId);
        if (student) {
          student.projectId = targetProjectId;
        }

        saveLocalDB(local);
      }
    );
  },

  // Algoritmo de auto-completado aleatorio ( Fisher-Yates )
  async autoCompleteInscriptions(courseId: string, laggingStudents: Student[], availableSlots: { projectId: string }[]): Promise<void> {
    return exec(
      async () => {
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
          // Leer actual (es batch, no podemos leer de la transacción, pero asumimos el estado local cargado)
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
      () => {
        const local = getLocalDB();

        // Mezclar con Fisher-Yates
        const shuffled = [...laggingStudents];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        shuffled.forEach((student, index) => {
          if (index < availableSlots.length) {
            const projId = availableSlots[index].projectId;
            
            // Actualizar estudiante
            const dbStudent = local.students.find((s) => s.id === student.id);
            if (dbStudent) dbStudent.projectId = projId;

            // Actualizar proyecto
            const dbProj = local.projects.find((p) => p.id === projId);
            if (dbProj && !dbProj.members.includes(student.id)) {
              dbProj.members.push(student.id);
            }
          }
        });

        // Cerrar curso
        const course = local.courses.find((c) => c.id === courseId);
        if (course) course.inscriptionsStatus = "closed";

        saveLocalDB(local);
      }
    );
  },

  async deleteProject(projectId: string): Promise<void> {
    return exec(
      async () => {
        const q = query(collection(db, "students"), where("projectId", "==", projectId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach((doc) => {
          batch.update(doc.ref, { projectId: null });
        });
        batch.delete(doc(db, "projects", projectId));
        await batch.commit();
      },
      () => {
        const local = getLocalDB();
        local.students.forEach((s) => {
          if (s.projectId === projectId) s.projectId = null;
        });
        local.projects = local.projects.filter((p) => p.id !== projectId);
        saveLocalDB(local);
      }
    );
  },

  async updateProject(projectId: string, name: string, maxMembers: number): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "projects", projectId), { name, max_members: maxMembers });
      },
      () => {
        const local = getLocalDB();
        const p = local.projects.find((proj) => proj.id === projectId);
        if (p) {
          p.name = name;
          p.max_members = maxMembers;
          saveLocalDB(local);
        }
      }
    );
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
}

export interface ActivityLog {
  id: string;
  courseId: string;
  projectId: string;
  task_id: string;
  user_id: string;
  user_name: string;
  previous_status: string;
  new_status: string;
  timestamp: string;
}

export const boardService = {
  async getTasks(projectId: string): Promise<Task[]> {
    return exec(
      async () => {
        const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
      },
      () => {
        return getLocalDB().tasks.filter((t) => t.projectId === projectId);
      }
    );
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
    return exec(
      async () => {
        await setDoc(doc(db, "tasks", newTask.id), newTask);
        return newTask;
      },
      () => {
        const local = getLocalDB();
        local.tasks.push(newTask);
        saveLocalDB(local);
        return newTask;
      }
    );
  },

  async updateTask(taskId: string, taskUpdates: Partial<Task>): Promise<void> {
    return exec(
      async () => {
        await updateDoc(doc(db, "tasks", taskId), taskUpdates as any);
      },
      () => {
        const local = getLocalDB();
        const index = local.tasks.findIndex((t) => t.id === taskId);
        if (index >= 0) {
          local.tasks[index] = { ...local.tasks[index], ...taskUpdates };
          saveLocalDB(local);
        }
      }
    );
  },

  async deleteTask(taskId: string): Promise<void> {
    return exec(
      async () => {
        // En Firestore, el borrado físico de la tarjeta es normal
        await updateDoc(doc(db, "tasks", taskId), { deleted: true }); // O borrado completo, use setDoc o deleteDoc.
      },
      () => {
        const local = getLocalDB();
        local.tasks = local.tasks.filter((t) => t.id !== taskId);
        saveLocalDB(local);
      }
    );
  },

  async createActivityLog(log: Omit<ActivityLog, "id" | "timestamp">): Promise<ActivityLog> {
    const newLog: ActivityLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };
    return exec(
      async () => {
        await addDoc(collection(db, "activity_logs"), newLog);
        return newLog;
      },
      () => {
        const local = getLocalDB();
        local.activity_logs.push(newLog);
        saveLocalDB(local);
        return newLog;
      }
    );
  },

  async getActivityLogs(courseId: string, projectId?: string): Promise<ActivityLog[]> {
    return exec(
      async () => {
        let q = query(
          collection(db, "activity_logs"),
          where("courseId", "==", courseId),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ActivityLog[];
        return projectId ? logs.filter((l) => l.projectId === projectId) : logs;
      },
      () => {
        const logs = getLocalDB().activity_logs.filter((l) => l.courseId === courseId);
        // Ordenar por fecha desc
        const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return projectId ? sorted.filter((l) => l.projectId === projectId) : sorted;
      }
    );
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
    return exec(
      async () => {
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
      () => {
        const users = getLocalDB().users || [];
        return role ? users.filter((u) => u.role === role) : users;
      }
    );
  },

  async createUser(user: UserAccount): Promise<UserAccount> {
    return exec(
      async () => {
        await setDoc(doc(db, "users", user.email), user);
        return user;
      },
      () => {
        const local = getLocalDB();
        if (!local.users) local.users = [];
        local.users = local.users.filter((u) => u.email !== user.email);
        local.users.push(user);
        saveLocalDB(local);
        return user;
      }
    );
  }
};

