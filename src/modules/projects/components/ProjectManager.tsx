"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../../shared/components/Layout";
import { useProjects } from "../hooks/useProjects";
import { projectService, Project } from "../../shared/services/firebase";
import { GroupImporter } from "./GroupImporter";
import {
  Plus,
  Calendar,
  Users,
  Settings2,
  AlertCircle,
  FolderPlus
} from "lucide-react";

export const ProjectManager: React.FC = () => {
  const { selectedCourse } = useDashboard();
  const { createProject, updateMaxMembers, updateDeadline } = useProjects();

  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjMaxMembers, setNewProjMaxMembers] = useState(4);
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [editingCapacityVal, setEditingCapacityVal] = useState(4);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);

  const loadData = async () => {
    if (!selectedCourse) return;
    try {
      const projList = await projectService.getProjects(selectedCourse.id);
      setProjects(projList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourse]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newProjectName.trim()) return;
    setActionError(null);
    const proj = await createProject(selectedCourse.id, newProjectName, newProjMaxMembers);
    if (proj) {
      setNewProjectName("");
      setNewProjMaxMembers(4);
      loadData();
    }
  };

  const handleUpdateCapacity = async (projectId: string) => {
    setActionError(null);
    const success = await updateMaxMembers(projectId, editingCapacityVal);
    if (success) {
      setEditingCapacityId(null);
      loadData();
    } else {
      setActionError("Error al actualizar la capacidad del grupo");
    }
  };

  const handleUpdateDeadline = async (projectId: string, deadline: string) => {
    setActionError(null);
    const success = await updateDeadline(projectId, deadline);
    if (success) {
      loadData();
    }
  };

  if (!selectedCourse) return null;

  return (
    <div className="space-y-6">
      {/* Cabecera y Formulario de Creación */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            Configuración de Grupos
          </h2>
          <p className="text-xs text-zinc-400">Instancia proyectos de trabajo y define límites de capacidad y deadlines.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <form onSubmit={handleCreateProject} className="flex flex-wrap gap-2.5 items-center bg-zinc-900/50 p-3 border border-white/5 rounded-2xl">
            <input
              type="text"
              required
              placeholder="Nombre del Grupo/Proyecto..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 lg:w-48 text-xs bg-zinc-900 border border-white/5 text-gray-200 rounded-lg px-2.5 py-1.5 placeholder-gray-500 focus:outline-none focus:border-white"
            />
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 rounded-lg px-2 py-1">
              <span className="text-[9px] text-gray-500 uppercase font-semibold">Integrantes:</span>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={newProjMaxMembers}
                onChange={(e) => setNewProjMaxMembers(parseInt(e.target.value) || 4)}
                className="w-8 text-center text-xs bg-transparent border-none text-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-all cursor-pointer shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Crear Grupo
            </button>
          </form>

          <button
            onClick={() => setShowImporter(!showImporter)}
            className={`px-3 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              showImporter
                ? "bg-brand-purple text-white border-brand-purple shadow-sm shadow-brand-purple/20"
                : "bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-650 dark:text-zinc-300 shadow-xs"
            }`}
          >
            {showImporter ? "Ocultar Carga Masiva" : "Carga Masiva (Excel / JSON)"}
          </button>
        </div>
      </div>

      {showImporter && (
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm animate-slide-down">
          <GroupImporter
            courseId={selectedCourse.id}
            onImportSuccess={() => {
              loadData();
              setShowImporter(false);
            }}
          />
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Listado de Proyectos */}
      {projects.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
          Aún no se ha creado ningún grupo. Introduce el nombre y capacidad arriba para empezar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {projects.map((project) => {
            const fillPercentage = Math.min((project.members.length / project.max_members) * 100, 100);
            return (
              <div
                key={project.id}
                className="p-6 bg-zinc-950 border border-zinc-800 hover:border-brand-purple/20 rounded-2xl flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-purple/5 relative group overflow-hidden shadow-xs"
              >
                {/* Glowing Top Line on Hover */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

                <div className="space-y-4 min-w-0">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-850">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-zinc-100 text-sm tracking-tight truncate group-hover:text-brand-purple transition-all" title={project.name}>
                        {project.name}
                      </h4>
                      <p className="text-[10px] text-zinc-450 mt-0.5">ID: {project.id.slice(0, 8)}</p>
                    </div>
                    
                    {/* Configuración de Capacidad */}
                    <div className="flex-shrink-0">
                      {editingCapacityId === project.id ? (
                        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 border border-zinc-800 rounded-lg" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={editingCapacityVal}
                            onChange={(e) => setEditingCapacityVal(parseInt(e.target.value) || 1)}
                            className="w-10 text-center text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 rounded py-0.5 focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateCapacity(project.id)}
                            className="px-2 py-0.5 bg-zinc-800 dark:bg-white text-zinc-100 dark:text-black rounded text-[10px] font-bold cursor-pointer hover:bg-zinc-700 dark:hover:bg-gray-200"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCapacityId(project.id);
                            setEditingCapacityVal(project.max_members);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 font-semibold cursor-pointer transition-all"
                          title="Cambiar capacidad límite"
                        >
                          <Settings2 className="w-3 h-3 text-zinc-400" />
                          Cupos: {project.max_members}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Progress Bar (Ocupación) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-zinc-400">Cupos Ocupados:</span>
                      <span className="font-semibold text-zinc-100">
                        {project.members.length} / {project.max_members} ({fillPercentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-850 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-555 rounded-full ${
                          fillPercentage === 100 ? "bg-brand-rose" : "bg-brand-purple"
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Deadline de Entrega */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      Fecha de Entrega:
                    </span>
                    <input
                      type="date"
                      value={project.deadline ? project.deadline.split("T")[0] : ""}
                      onChange={(e) => handleUpdateDeadline(project.id, new Date(e.target.value).toISOString())}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-brand-purple cursor-pointer"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 border-t border-zinc-850 pt-3 mt-3 flex justify-between items-center">
                  <span>Estado del Proyecto:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded ${
                    project.members.length === 0
                      ? "bg-zinc-900 text-zinc-300"
                      : project.members.length >= project.max_members
                      ? "bg-brand-rose/10 text-brand-rose"
                      : "bg-brand-purple/10 text-brand-purple"
                  }`}>
                    {project.members.length === 0
                      ? "Vacío"
                      : project.members.length >= project.max_members
                      ? "Lleno"
                      : "Activo"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
