"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDashboard } from "../../shared/components/Layout";
import { projectService, studentService, Project, Student } from "../../shared/services/firebase";
import { Briefcase, Users, Calendar, Clock, ArrowRight, Mail, User, Phone, BookOpen, FileText, Pencil, Save, X } from "lucide-react";

export const StudentProjectDetails: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedCourse, setCurrentView } = useDashboard();
  
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Construction Section State
  const [isEditingConstruction, setIsEditingConstruction] = useState(false);
  const [constructionData, setConstructionData] = useState({
    introduction: "",
    purpose: "",
    objectives: "",
  });
  const [savingConstruction, setSavingConstruction] = useState(false);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!currentUser || !currentUser.projectId || !selectedCourse) {
        setLoading(false);
        return;
      }
      try {
        // Cargar todos los proyectos del curso para encontrar el del estudiante
        const projects = await projectService.getProjects(selectedCourse.id);
        const myProj = projects.find((p) => p.id === currentUser.projectId);
        
        if (myProj) {
          setProject(myProj);
          if (myProj.construction) {
            setConstructionData({
              introduction: myProj.construction.introduction || "",
              purpose: myProj.construction.purpose || "",
              objectives: myProj.construction.objectives || "",
            });
          }
          
          // Cargar todos los estudiantes del curso
          const allStudents = await studentService.getStudents(selectedCourse.id);
          // Filtrar los que pertenecen a este grupo
          const members = allStudents.filter((s) => myProj.members.includes(s.id));
          setTeamMembers(members);
        }
      } catch (e) {
        console.error("Error al cargar datos del proyecto del estudiante:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [currentUser, selectedCourse]);

  const handleSaveConstruction = async () => {
    if (!project) return;
    setSavingConstruction(true);
    try {
      await projectService.updateProjectConstruction(project.id, constructionData);
      setProject({ ...project, construction: constructionData });
      setIsEditingConstruction(false);
    } catch (e) {
      console.error("Error al guardar construcción:", e);
    } finally {
      setSavingConstruction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-gray-500 animate-pulse">
        Cargando detalles de tu proyecto...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center bg-[#121214] border border-white/5 rounded-2xl max-w-md mx-auto space-y-4">
        <Briefcase className="w-12 h-12 text-gray-600 mx-auto" />
        <h3 className="text-sm font-semibold text-white">Sin Proyecto Asignado</h3>
        <p className="text-xs text-gray-400 leading-normal">
          Aún no has sido matriculado en ningún grupo para este curso. Por favor, solicita a tu docente que te asigne a un equipo de trabajo.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Tarjeta de Encabezado Principal */}
      <div className="p-6 md:p-8 bg-[#121214] border border-white/5 rounded-2xl relative overflow-hidden group shadow-xl">
        {/* Glow de acento superior */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-brand-purple/10 text-brand-purple uppercase border border-brand-purple/20">
              Mi Equipo de Trabajo
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">{project.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                Curso: <strong className="text-gray-300 font-semibold">{selectedCourse?.name}</strong>
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                Integrantes: <strong className="text-gray-300 font-semibold">{project.members.length} / {project.max_members}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={() => setCurrentView("board")}
            className="flex items-center justify-center gap-1.5 px-5 py-3 bg-white text-black text-xs font-bold rounded-xl hover:bg-gray-250 transition-all cursor-pointer shadow-md self-start md:self-center"
          >
            Ir al Tablero Kanban
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detalles del Plazo y Periodo */}
      {project.deadline && (
        <div className="p-5 bg-brand-rose/5 border border-brand-rose/10 rounded-2xl flex items-center gap-4">
          <Calendar className="w-5 h-5 text-brand-rose flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fecha de Entrega Final</h4>
            <p className="text-xs text-gray-300 mt-0.5">
              El plazo límite de entrega asignado por tu docente vence el{" "}
              <strong className="text-brand-rose font-semibold">
                {new Date(project.deadline).toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* Sección de Construcción del Proyecto */}
      <div className="p-6 bg-[#121214] border border-white/5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-purple" />
              Generalidades del Proyecto (Construcción)
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Define los aspectos centrales y teóricos de tu proyecto ágil.</p>
          </div>
          {isEditingConstruction ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditingConstruction(false);
                  if (project.construction) {
                    setConstructionData({
                      introduction: project.construction.introduction || "",
                      purpose: project.construction.purpose || "",
                      objectives: project.construction.objectives || "",
                    });
                  }
                }}
                className="px-3 py-1.5 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                disabled={savingConstruction}
              >
                <X className="w-3 h-3" /> Cancelar
              </button>
              <button
                onClick={handleSaveConstruction}
                disabled={savingConstruction}
                className="px-3 py-1.5 flex items-center gap-1.5 bg-brand-emerald hover:bg-emerald-500 text-black text-[10px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3 h-3" /> {savingConstruction ? "Guardando..." : "Guardar"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingConstruction(true)}
              className="px-3 py-1.5 flex items-center gap-1.5 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple text-[10px] font-bold border border-brand-purple/20 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Pencil className="w-3 h-3" /> Editar Generalidades
            </button>
          )}
        </div>

        <div className="space-y-6 pt-2">
          {/* Introducción */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Introducción</h4>
            {isEditingConstruction ? (
              <textarea
                value={constructionData.introduction}
                onChange={(e) => setConstructionData({ ...constructionData, introduction: e.target.value })}
                placeholder="Escribe una breve introducción del proyecto..."
                className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30 transition-all resize-none custom-scrollbar"
              />
            ) : (
              <p className="text-xs text-zinc-400 whitespace-pre-wrap bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                {project.construction?.introduction || <span className="italic text-gray-600">No se ha definido la introducción.</span>}
              </p>
            )}
          </div>

          {/* Propósito */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Propósito del Proyecto</h4>
            {isEditingConstruction ? (
              <textarea
                value={constructionData.purpose}
                onChange={(e) => setConstructionData({ ...constructionData, purpose: e.target.value })}
                placeholder="¿Cuál es el propósito o la justificación principal de este proyecto?"
                className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30 transition-all resize-none custom-scrollbar"
              />
            ) : (
              <p className="text-xs text-zinc-400 whitespace-pre-wrap bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                {project.construction?.purpose || <span className="italic text-gray-600">No se ha definido el propósito.</span>}
              </p>
            )}
          </div>

          {/* Objetivos */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Objetivos</h4>
            {isEditingConstruction ? (
              <textarea
                value={constructionData.objectives}
                onChange={(e) => setConstructionData({ ...constructionData, objectives: e.target.value })}
                placeholder="Enumera los objetivos generales y específicos..."
                className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30 transition-all resize-none custom-scrollbar"
              />
            ) : (
              <p className="text-xs text-zinc-400 whitespace-pre-wrap bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                {project.construction?.objectives || <span className="italic text-gray-600">No se han definido los objetivos.</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Listado de Compañeros de Equipo */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-500" />
          Compañeros de Proyecto ({teamMembers.length})
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teamMembers.map((member) => {
            const isMe = member.id === currentUser?.id;
            return (
              <div
                key={member.id}
                className={`p-5 rounded-xl border flex flex-col justify-between min-h-[130px] relative group overflow-hidden ${
                  isMe
                    ? "bg-brand-purple/2 border-brand-purple/20"
                    : "bg-[#121214] border-white/5 hover:border-white/10"
                }`}
              >
                {isMe && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 bg-brand-purple/10 text-brand-purple text-[8px] font-bold rounded uppercase border border-brand-purple/20">
                    Tú
                  </span>
                )}
                
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    {member.nombre_completo}
                  </h4>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-white/5 mt-3 w-full">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                    <span className="truncate">{member.correo_institucional}</span>
                  </div>
                  {member.telefono && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      <span>{member.telefono}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
