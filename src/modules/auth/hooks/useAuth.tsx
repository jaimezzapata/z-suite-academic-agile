"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Student, studentService, userService } from "../../shared/services/firebase";
import { auth, db } from "../../../../sdk-firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

export type UserRole = "admin" | "docente" | "estudiante";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  codigo?: string;
  courseId: string | null;
  projectId: string | null;
}

interface AuthContextType {
  currentUser: CurrentUser | null;
  loading: boolean;
  loginWithCredentials: (email: string, codeOrPassword: string) => Promise<boolean>;
  logout: () => void;
  refreshUserSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario persistido en LocalStorage al iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem("academic_agile_session");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch (e) {
        console.error("Error al cargar sesión persistida", e);
      }
    }
    setLoading(false);
  }, []);
  // Listener en tiempo real para estudiantes
  useEffect(() => {
    if (!currentUser || currentUser.role !== "estudiante") return;

    const unsub = onSnapshot(doc(db, "students", currentUser.id), (docSnap) => {
      if (docSnap.exists()) {
        const studentData = docSnap.data();
        const updatedUser: CurrentUser = {
          ...currentUser,
          name: studentData.nombre_completo,
          email: studentData.correo_institucional,
          codigo: studentData.codigo_estudiante,
          courseId: studentData.courseId,
          projectId: studentData.projectId,
        };
        
        // Solo actualizar si hubo cambios (comparación simple de courseId y projectId)
        if (currentUser.projectId !== updatedUser.projectId || currentUser.courseId !== updatedUser.courseId) {
          setCurrentUser(updatedUser);
          localStorage.setItem("academic_agile_session", JSON.stringify(updatedUser));
        }
      }
    });

    return () => unsub();
  }, [currentUser?.id, currentUser?.role]); // Solo depende del ID y rol para no causar loops con los demás cambios

  const loginWithCredentials = async (email: string, codeOrPassword: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = codeOrPassword.trim();

    // 1. Intentar autenticar con Firebase Authentication (Real)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedCode);
      const firebaseUser = userCredential.user;

      if (normalizedEmail === "zapataval2304@gmail.com") {
        const adminUser: CurrentUser = {
          id: firebaseUser.uid,
          name: "Jaime Zapata",
          email: normalizedEmail,
          role: "admin",
          courseId: null,
          projectId: null,
        };
        setCurrentUser(adminUser);
        localStorage.setItem("academic_agile_session", JSON.stringify(adminUser));
        return true;
      }

      // Si no es el admin principal, verificar si es un docente registrado en la base de datos
      const docRef = doc(db, "users", normalizedEmail);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const teacherUser: CurrentUser = {
          id: firebaseUser.uid,
          name: data.name || "Docente",
          email: normalizedEmail,
          role: "docente",
          courseId: null,
          projectId: null,
        };
        setCurrentUser(teacherUser);
        localStorage.setItem("academic_agile_session", JSON.stringify(teacherUser));
        return true;
      }
    } catch (authError: any) {
      console.log("Firebase Auth skip o fallback database:", authError.code || authError.message);
      // Si es el admin y la autenticación falló, denegar inmediatamente
      if (normalizedEmail === "zapataval2304@gmail.com") {
        throw new Error("Contraseña incorrecta para el usuario administrador.");
      }
    }

    // 2. Fallback de Base de Datos: Validar en la colección de usuarios (docentes/admin local o fallback)
    try {
      const usersList = await userService.getUsers();
      const user = usersList.find(
        (u) =>
          u.email.toLowerCase() === normalizedEmail &&
          u.code === normalizedCode
      );

      if (user) {
        const loggedUser: CurrentUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // "admin" o "docente"
          courseId: null,
          projectId: null,
        };
        setCurrentUser(loggedUser);
        localStorage.setItem("academic_agile_session", JSON.stringify(loggedUser));
        return true;
      }
    } catch (e) {
      console.error("Error al consultar la colección de usuarios de respaldo:", e);
    }

    // 3. Fallback Estudiantes: Validar estudiante en la base de datos
    try {
      const studentsList = await studentService.getStudents();
      const student = studentsList.find(
        (s) =>
          s.correo_institucional.toLowerCase() === normalizedEmail &&
          s.codigo_estudiante === normalizedCode
      );

      if (student) {
        const studentUser: CurrentUser = {
          id: student.id,
          name: student.nombre_completo,
          email: student.correo_institucional,
          role: "estudiante",
          codigo: student.codigo_estudiante,
          courseId: student.courseId,
          projectId: student.projectId,
        };
        setCurrentUser(studentUser);
        localStorage.setItem("academic_agile_session", JSON.stringify(studentUser));
        return true;
      }
    } catch (e) {
      console.error("Error durante validación de estudiante de respaldo:", e);
    }

    throw new Error("Credenciales inválidas. Por favor verifique el correo y código.");
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("academic_agile_session");
  };

  const refreshUserSession = async () => {
    if (!currentUser) return;
    
    if (currentUser.role === "admin" || currentUser.role === "docente") {
      try {
        const users = await userService.getUsers();
        const updated = users.find((u) => u.email === currentUser.email);
        if (updated) {
          const updatedUser: CurrentUser = {
            ...currentUser,
            name: updated.name,
            email: updated.email,
            role: updated.role,
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("academic_agile_session", JSON.stringify(updatedUser));
        }
      } catch (e) {
        console.error("Error al refrescar sesión de docente/admin", e);
      }
      return;
    }

    try {
      const students = await studentService.getStudents();
      const updatedStudent = students.find((s) => s.id === currentUser.id);
      
      if (updatedStudent) {
        const updatedUser: CurrentUser = {
          ...currentUser,
          name: updatedStudent.nombre_completo,
          email: updatedStudent.correo_institucional,
          codigo: updatedStudent.codigo_estudiante,
          courseId: updatedStudent.courseId,
          projectId: updatedStudent.projectId,
        };
        setCurrentUser(updatedUser);
        localStorage.setItem("academic_agile_session", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Error al refrescar sesión de estudiante:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        loginWithCredentials,
        logout,
        refreshUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
