"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboard } from "../../shared/components/Layout";
import { useProjects } from "../hooks/useProjects";
import { projectService, studentService, Student, Project } from "../../shared/services/firebase";
import { Users, UserPlus, Check, AlertCircle } from "lucide-react";

export const ProjectEnrollment: React.FC = () => {
  const { currentUser, refreshUserSession } = useAuth();
  const { selectedCourse, setCurrentView, setSelectedProjectId } = useDashboard();
  const { joinProject, error: enrollError } = useProjects();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  const loadProjectsAndMembers = async () => {
    if (!selectedCourse) return;
    try {
      const [projList, studList] = await Promise.all([
        projectService.getProjects(selectedCourse.id),
        studentService.getStudents(selectedCourse.id),
      ]);
      setProjects(projList);
      setAllStudents(studList);
    } catch (e) {
      console.error("Error al cargar proyectos:", e);
    }
  };

  useEffect(() => {
    loadProjectsAndMembers();
  }, [selectedCourse]);

  const handleJoin = async (projectId: string) => {
    if (!currentUser || !selectedCourse) return;
    if (selectedCourse.inscriptionsStatus === "closed") {
      return;
    }
    setLoadingProjectId(projectId);
    
    const success = await joinProject(currentUser.id, projectId);
    if (success) {
      // Refrescar sesión para actualizar el projectId en el cliente
      await refreshUserSession();
      setSelectedProjectId(projectId);
      setCurrentView("board");
    }
    setLoadingProjectId(null);
  };

  const getStudentName = (id: string) => {
    const student = allStudents.find((s) => s.id === id);
    return student ? student.nombre_completo : "Estudiante";
  };

  if (!selectedCourse) return null;

  const isClosed = selectedCourse.inscriptionsStatus === "closed";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-blue" />
          Auto-Inscripción de Equipos
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {isClosed 
            ? "El docente ha cerrado temporalmente el proceso de matrícula de estudiantes a proyectos."
            : "Las inscripciones están abiertas. Selecciona un grupo de trabajo libre para unirte a tu proyecto."}
        </p>
      </div>

      {enrollError && (
        <div className="p-3.5 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2.5 animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{enrollError}</span>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
          El docente aún no ha creado ningún proyecto vacío en este curso. Por favor, solicite a su docente la instanciación de grupos.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const currentMembersCount = project.members.length;
            const maxMembers = project.max_members;
            const freeSlots = maxMembers - currentMembersCount;
            const isFull = freeSlots <= 0;
            const isLoading = loadingProjectId === project.id;

            return (
              <div
                key={project.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between h-64 ${
                  isFull
                    ? "bg-[#090d16]/10 border-white/5 opacity-70"
                    : "bg-zinc-900 border-white/5 hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/5"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-base truncate">{project.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border ${
                        isFull
                          ? "bg-brand-rose/10 text-brand-rose border-brand-rose/10"
                          : "bg-brand-blue/10 text-brand-blue border-brand-blue/10"
                      }`}
                    >
                      {isFull ? "Grupo Lleno" : `${freeSlots} Cupo(s) libre(s)`}
                    </span>
                  </div>

                  {/* Listado de integrantes actuales */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Integrantes:</p>
                    {project.members.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Grupo vacío. Sé el primero en unirte.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {project.members.map((memberId) => (
                          <span
                            key={memberId}
                            className="inline-flex items-center px-2 py-1 bg-white/2 border border-white/5 rounded-lg text-xs text-gray-300"
                          >
                            <span className="w-2 h-2 rounded-full bg-brand-blue/70 mr-1.5" />
                            {getStudentName(memberId)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  {isClosed ? (
                    <button
                      disabled
                      className="w-full text-center py-2 bg-zinc-950 text-gray-600 rounded-xl text-xs font-semibold cursor-not-allowed"
                    >
                      Inscripciones Cerradas
                    </button>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full text-center py-2 bg-zinc-950 text-gray-600 rounded-xl text-xs font-semibold cursor-not-allowed"
                    >
                      Cupos Agotados
                    </button>
                  ) : (
                    <button
                      disabled={loadingProjectId !== null}
                      onClick={() => handleJoin(project.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue text-white text-xs font-semibold rounded-xl hover:bg-brand-blue/90 transition-all shadow-md shadow-brand-blue/20 cursor-pointer disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      {isLoading ? "Uniéndose..." : "Unirse al Grupo"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
