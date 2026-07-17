"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { subscribeToDBMode, DBMode, courseService, Course } from "../services/firebase";
import {
  Kanban,
  BarChart3,
  History,
  GraduationCap,
  Briefcase,
  Database,
  Menu,
  X,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck
} from "lucide-react";

export type DashboardView = "board" | "courses" | "projects" | "analytics" | "logs" | "teachers-admin" | "enrollment" | "students-list";

interface DashboardContextType {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  selectedCourse: Course | null;
  setSelectedCourse: (course: Course | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  courses: Course[];
  refreshCourses: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard debe ser usado dentro de un DashboardProvider");
  return context;
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>("courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  const loadCourses = async () => {
    try {
      const list = await courseService.getCourses();
      setCourses(list);
      
      // Auto-seleccionar curso para estudiantes
      if (list.length > 0) {
        if (currentUser && currentUser.role === "estudiante" && currentUser.courseId) {
          const studentCourse = list.find((c) => c.id === currentUser.courseId);
          if (studentCourse) {
            setSelectedCourse(studentCourse);
            return;
          }
        }
        
        if (!selectedCourse) {
          setSelectedCourse(list[0]);
        }
      }
    } catch (e) {
      console.error("Error al cargar cursos:", e);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [currentUser]);

  // Redirección por rol
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "estudiante") {
        if (!currentUser.projectId) {
          setCurrentView("projects");
        } else {
          setCurrentView("board");
          setSelectedProjectId(currentUser.projectId);
        }
        
        if (currentUser.courseId && courses.length > 0) {
          const studentCourse = courses.find((c) => c.id === currentUser.courseId);
          if (studentCourse) setSelectedCourse(studentCourse);
        }
      } else if (currentUser.role === "admin") {
        setCurrentView("teachers-admin");
      } else {
        if (courses.length > 0 && !selectedCourse) {
          setSelectedCourse(courses[0]);
        }
      }
    }
  }, [currentUser, courses]);

  return (
    <DashboardContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedCourse,
        setSelectedCourse,
        selectedProjectId,
        setSelectedProjectId,
        courses,
        refreshCourses: loadCourses,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const { currentView, setCurrentView, selectedCourse, setSelectedCourse, courses } = useDashboard();
  const [dbMode, setDbMode] = useState<DBMode>("firestore");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDBMode((mode) => setDbMode(mode));
    return unsubscribe;
  }, []);

  const navItems = [
    {
      id: "teachers-admin" as DashboardView,
      label: "Gestión de Docentes",
      icon: Users,
      roles: ["admin"],
    },
    {
      id: "courses" as DashboardView,
      label: "Cursos",
      icon: GraduationCap,
      roles: ["docente"],
    },
    {
      id: "projects" as DashboardView,
      label: currentUser?.role === "estudiante" && !currentUser.projectId ? "Auto-Inscripción" : "Grupos / Proyectos",
      icon: Briefcase,
      roles: ["docente", "estudiante"],
    },
    {
      id: "students-list" as DashboardView,
      label: "Matrícula de Estudiantes",
      icon: Users,
      roles: ["docente"],
    },
    {
      id: "enrollment" as DashboardView,
      label: "Asignación de Grupos",
      icon: UserCheck,
      roles: ["docente"],
    },
    {
      id: "board" as DashboardView,
      label: "Tablero Kanban",
      icon: Kanban,
      roles: ["docente", "estudiante"],
      disabled: currentUser?.role === "estudiante" && !currentUser.projectId,
    },
    {
      id: "analytics" as DashboardView,
      label: "Métricas y Analíticas",
      icon: BarChart3,
      roles: ["docente"],
    },
    {
      id: "logs" as DashboardView,
      label: "Logs de Auditoría",
      icon: History,
      roles: ["docente"],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => currentUser && item.roles.includes(currentUser.role)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#e4e4e7]">
      {/* Header Fino y Minimalista */}
      <header className="h-14 px-4 md:px-6 flex items-center justify-between border-b border-white/5 bg-[#121214] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsSidebarOpen(!isSidebarOpen);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 focus:outline-none cursor-pointer"
            title="Alternar barra lateral"
          >
            {isSidebarOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Kanban className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight hidden sm:inline">
              Agile Academic Hub
            </span>
          </div>

          {/* Database Mode Pill */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-medium transition-all ${
              dbMode === "firestore"
                ? "bg-brand-emerald/5 text-brand-emerald border-brand-emerald/10"
                : "bg-brand-amber/5 text-brand-amber border-brand-amber/10"
            }`}
          >
            <Database className="w-2.5 h-2.5" />
            <span className="hidden xs:inline">
              {dbMode === "firestore" ? "Firebase Conectado" : "Almacenamiento Local (Fallback)"}
            </span>
            <span className="xs:hidden">{dbMode === "firestore" ? "Firebase" : "Local"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Cursos Activos para Docente */}
          {currentUser?.role === "docente" && courses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-semibold uppercase">Curso:</span>
              <select
                value={selectedCourse?.id || ""}
                onChange={(e) => {
                  const course = courses.find((c) => c.id === e.target.value);
                  if (course) setSelectedCourse(course);
                }}
                className="text-xs bg-[#18181b] border border-white/5 text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-white cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre de Usuario sutil en el Header */}
          {currentUser && (
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-gray-500 font-semibold leading-none">{currentUser.role === "docente" ? "Docente" : "Estudiante"}</p>
              <p className="text-xs text-white font-medium mt-0.5">{currentUser.name}</p>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Left Sidebar - Desktop (Soporta colapsado y expansión con animación de ancho) */}
        <aside className={`${isSidebarCollapsed ? "w-16 px-2" : "w-60 p-4"} border-r border-white/5 bg-[#121214] hidden md:flex flex-col gap-5 sticky top-14 h-[calc(100vh-56px)] transition-all duration-200`}>
          
          {/* Botón de Colapsar/Expandir en la cabecera interna de la barra lateral */}
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                Navegación
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-lg hover:bg-white/5 text-gray-400 cursor-pointer ml-auto focus:outline-none"
              title={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {currentUser && (
            <div className={`bg-[#18181b] rounded-xl border border-white/5 transition-all ${isSidebarCollapsed ? "p-1.5 text-center" : "p-3"}`}>
              {isSidebarCollapsed ? (
                <div
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[10px] mx-auto text-white"
                  title={`${currentUser.name} (${currentUser.role})`}
                >
                  {currentUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>
              ) : (
                <>
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                    Sesión Activa
                  </p>
                  <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
                  <p className="text-[10px] text-gray-400 capitalize">{currentUser.role}</p>
                  {currentUser.role === "estudiante" && (
                    <div className="mt-2 text-[9px] py-0.5 px-1.5 bg-brand-blue/10 text-brand-blue rounded border border-brand-blue/10 inline-block font-semibold">
                      {currentUser.projectId ? "Equipo Asignado" : "Sin Equipo"}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex flex-col gap-0.5">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isDisabled = item.disabled;

              return (
                <button
                  key={item.id}
                  disabled={isDisabled}
                  onClick={() => {
                    setCurrentView(item.id);
                  }}
                  className={`w-full flex items-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSidebarCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                  } ${
                    isActive
                      ? "bg-white/5 text-white border-l-2 border-white"
                      : isDisabled
                      ? "text-gray-600 cursor-not-allowed opacity-40"
                      : "text-gray-400 hover:text-white hover:bg-white/2"
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : ""}`} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Botón de Cerrar Sesión Sutil al final */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <button
              onClick={logout}
              className={`w-full flex items-center rounded-lg text-xs font-semibold text-brand-rose hover:bg-brand-rose/5 border border-transparent hover:border-brand-rose/15 transition-all cursor-pointer ${
                isSidebarCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
              }`}
              title={isSidebarCollapsed ? "Cerrar Sesión" : undefined}
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* Left Sidebar - Mobile Drawer */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-14 bottom-0 w-60 bg-[#121214] border-r border-white/5 p-4 flex flex-col gap-5 z-30 md:hidden animate-slide-right">
              {currentUser && (
                <div className="p-3 bg-[#18181b] rounded-xl border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                    Sesión Activa
                  </p>
                  <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
                  <p className="text-[10px] text-gray-400 capitalize">{currentUser.role}</p>
                </div>
              )}

              {currentUser?.role === "docente" && courses.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Seleccionar Curso:</span>
                  <select
                    value={selectedCourse?.id || ""}
                    onChange={(e) => {
                      const course = courses.find((c) => c.id === e.target.value);
                      if (course) setSelectedCourse(course);
                    }}
                    className="text-xs bg-[#18181b] border border-white/5 text-white rounded-lg px-2.5 py-1.5"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <nav className="flex flex-col gap-0.5">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isDisabled = item.disabled;

                  return (
                    <button
                      key={item.id}
                      disabled={isDisabled}
                      onClick={() => {
                        setCurrentView(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-white/5 text-white border-l-2 border-white"
                          : isDisabled
                          ? "text-gray-600 cursor-not-allowed opacity-40"
                          : "text-gray-400 hover:text-white hover:bg-white/2"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : ""}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    logout();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-brand-rose hover:bg-brand-rose/5 border border-transparent hover:border-brand-rose/15 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Sesión
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main Work Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden max-w-full">
          <div className="max-w-7xl mx-auto w-full h-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
