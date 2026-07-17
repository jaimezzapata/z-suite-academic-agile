"use client";

import React, { useState } from "react";
import { AuthProvider, useAuth } from "../modules/auth/hooks/useAuth";
import { DashboardProvider, useDashboard, Layout } from "../modules/shared/components/Layout";
import { CourseManager } from "../modules/courses/components/CourseManager";
import { EnrollmentManager, StudentRegistry } from "../modules/courses/components/EnrollmentManager";
import { ProjectEnrollment } from "../modules/projects/components/ProjectEnrollment";
import { ProjectManager } from "../modules/projects/components/ProjectManager";
import { StudentProjectDetails } from "../modules/projects/components/StudentProjectDetails";
import { KanbanBoard } from "../modules/board/components/KanbanBoard";
import { AnalyticsDashboard } from "../modules/analytics/components/AnalyticsDashboard";
import { AuditLogViewer } from "../modules/board/components/AuditLogViewer";
import { TeacherManager } from "../modules/auth/components/TeacherManager";
import { ThemeSelector } from "../modules/shared/components/ThemeSelector";
import { Kanban, AlertCircle, Key, Mail, ArrowRight } from "lucide-react";

function DashboardContent() {
  const { currentUser, loading, loginWithCredentials } = useAuth();
  const { currentView } = useDashboard();
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Evitar parpadeo del formulario si el estado de auth se está cargando desde localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-xs text-gray-500 animate-pulse">Cargando aplicación...</div>
      </div>
    );
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email.trim()) {
      setLoginError("Por favor ingrese su correo institucional.");
      return;
    }
    if (!password.trim()) {
      setLoginError("Por favor ingrese su código de estudiante / contraseña.");
      return;
    }

    setLoginLoading(true);
    try {
      const success = await loginWithCredentials(email, password);
      if (success) {
        setEmail("");
        setPassword("");
      }
    } catch (err: any) {
      setLoginError(err.message || "Error al iniciar sesión.");
    } finally {
      setLoginLoading(false);
    }
  };

  // 1. Si no hay sesión activa, mostrar Formulario de Login
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-6 relative font-sans">
        <div className="absolute top-4 right-4 z-50">
          <ThemeSelector />
        </div>
        <div className="w-full max-w-sm bg-[#121214] border border-white/5 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center border border-brand-purple/20 mx-auto mb-2 transition-all duration-300">
              <Kanban className="w-5 h-5 text-brand-purple transition-all duration-300" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Iniciar Sesión</h1>
            <p className="text-xs text-gray-400">Ingrese sus credenciales académicas para continuar.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-[11px] leading-normal">{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider block">
                Correo Electrónico
              </label>
              <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-3 py-2 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple/30 transition-all duration-300">
                <Mail className="w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  placeholder="nombre@universidad.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-xs bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider block">
                Contraseña / Código Estudiante
              </label>
              <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-3 py-2 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple/30 transition-all duration-300">
                <Key className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Contraseña / Código"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 text-xs bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-purple hover:bg-brand-purple-hover text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-purple/20 disabled:opacity-50 transition-all duration-300 cursor-pointer"
            >
              {loginLoading ? "Iniciando Sesión..." : "Ingresar"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Renderizado principal bajo el Layout con la vista conmutada por estado
  const renderView = () => {
    switch (currentView) {
      case "teachers-admin":
        return <TeacherManager />;
      case "courses":
        return <CourseManager />;
      case "projects":
        if (currentUser.role === "estudiante") {
          if (currentUser.projectId) {
            return <StudentProjectDetails />;
          }
          return <ProjectEnrollment />;
        }
        return <ProjectManager />;
      case "students-list":
        return <StudentRegistry />;
      case "enrollment":
        return <EnrollmentManager />;
      case "board":
        return <KanbanBoard />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "logs":
        return <AuditLogViewer />;
      default:
        return <CourseManager />;
    }
  };

  return <Layout>{renderView()}</Layout>;
}

export default function Home() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </AuthProvider>
  );
}
