"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../../shared/components/Layout";
import { useProjects } from "../../projects/hooks/useProjects";
import { useCourses } from "../hooks/useCourses";
import { StudentImporter } from "./StudentImporter";
import {
  studentService,
  projectService,
  Student,
  Project
} from "../../shared/services/firebase";
import {
  Unlock,
  Lock,
  Sparkles,
  AlertTriangle,
  Users,
  UserCheck,
  UserMinus,
  User,
  GraduationCap,
  Briefcase,
  Pencil,
  Trash2,
  PlusCircle,
  Plus,
  X
} from "lucide-react";

// =========================================================================
// VISTA 1: ENROLLMENT MANAGER (ASIGNACIÓN DE GRUPOS CON MODAL EN CUADRÍCULA)
// =========================================================================
export const EnrollmentManager: React.FC = () => {
  const { selectedCourse, refreshCourses } = useDashboard();
  const { updateInscriptionsStatus } = useCourses();
  const { moveStudent } = useProjects();

  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingAutoComplete, setLoadingAutoComplete] = useState(false);
  const [autoCompleteError, setAutoCompleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Proyecto seleccionado para ventana modal de matriculación
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<Project | null>(null);

  // Buscador de alumnos disponibles (Modal)
  const [searchAvailableQuery, setSearchAvailableQuery] = useState("");

  // Edición de Grupo/Proyecto
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectCapacity, setEditProjectCapacity] = useState(4);

  const loadData = async () => {
    if (!selectedCourse) return;
    try {
      const [studentList, projectList] = await Promise.all([
        studentService.getStudents(selectedCourse.id),
        projectService.getProjects(selectedCourse.id),
      ]);
      setStudents(studentList);
      setProjects(projectList);

      // Sincronizar el estado del proyecto en el modal si está abierto
      if (selectedProjectForModal) {
        const updatedProj = projectList.find((p) => p.id === selectedProjectForModal.id);
        if (updatedProj) {
          setSelectedProjectForModal(updatedProj);
        } else {
          setSelectedProjectForModal(null);
        }
      }
    } catch (e) {
      console.error("Error al cargar datos de asignación:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourse]);

  const handleToggleInscriptions = async (status: "open" | "closed") => {
    if (!selectedCourse) return;
    const success = await updateInscriptionsStatus(selectedCourse.id, status);
    if (success) {
      await refreshCourses();
      if (selectedCourse) {
        selectedCourse.inscriptionsStatus = status;
      }
    }
  };

  const handleRemoveStudent = async (studentId: string, projectId: string) => {
    setActionError(null);
    const success = await moveStudent(studentId, null, projectId);
    if (success) {
      loadData();
    } else {
      setActionError("Error al remover al estudiante del grupo.");
    }
  };

  const handleAddStudent = async (studentId: string, projectId: string) => {
    setActionError(null);
    const project = projects.find((p) => p.id === projectId);
    if (project && project.members.length >= project.max_members) {
      setActionError("No se puede asignar: El proyecto de destino se encuentra lleno.");
      return;
    }
    const success = await moveStudent(studentId, projectId, null);
    if (success) {
      loadData();
    } else {
      setActionError("Error al asignar al estudiante al grupo.");
    }
  };

  // Eliminar Grupo
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este grupo? Todos los estudiantes asignados a él volverán a estar rezagados.")) return;
    try {
      await projectService.deleteProject(projectId);
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Error al eliminar grupo");
    }
  };

  // Guardar Edición Grupo
  const handleStartEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setEditProjectCapacity(project.max_members);
  };

  const handleSaveProjectEdit = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    try {
      await projectService.updateProject(projectId, editProjectName.trim(), editProjectCapacity);
      setEditingProjectId(null);
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Error al actualizar grupo");
    }
  };

  // Filtrado de rezagados (sin grupo)
  const laggingStudents = students.filter((s) => !s.projectId);

  // Cupos disponibles totales
  const totalAvailableSlots = projects.reduce((acc, curr) => {
    const freeSlots = curr.max_members - curr.members.length;
    return acc + (freeSlots > 0 ? freeSlots : 0);
  }, 0);

  const canCloseInscriptions = totalAvailableSlots >= laggingStudents.length;

  const handleAutoComplete = async () => {
    if (!selectedCourse) return;
    setAutoCompleteError(null);

    if (!canCloseInscriptions) {
      setAutoCompleteError(
        "No es posible cerrar las inscripciones. Los proyectos creados no tienen suficiente capacidad total para albergar a los estudiantes rezagados restantes. Por favor, incremente los límites de capacidad o cree nuevos proyectos vacíos."
      );
      return;
    }

    setLoadingAutoComplete(true);
    try {
      const availableSlots: { projectId: string }[] = [];
      projects.forEach((proj) => {
        const freeSlots = proj.max_members - proj.members.length;
        for (let i = 0; i < freeSlots; i++) {
          availableSlots.push({ projectId: proj.id });
        }
      });

      await projectService.autoCompleteInscriptions(
        selectedCourse.id,
        laggingStudents,
        availableSlots
      );

      await Promise.all([refreshCourses(), loadData()]);
    } catch (e: any) {
      setAutoCompleteError(e.message || "Error al ejecutar auto-completado");
    } finally {
      setLoadingAutoComplete(false);
    }
  };

  // Filtros de búsqueda para el modal
  const filteredAvailableStudents = laggingStudents.filter(
    (s) =>
      s.nombre_completo.toLowerCase().includes(searchAvailableQuery.toLowerCase()) ||
      s.codigo_estudiante.includes(searchAvailableQuery)
  );

  if (!selectedCourse) {
    return (
      <div className="p-8 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
        Por favor, seleccione un curso en la pestaña "Cursos" para administrar su matrícula.
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full relative">
      {/* cabecera y barra de control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] p-4 border border-white/5 rounded-2xl animate-fade-in shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Curso Seleccionado</p>
            <h3 className="text-xs font-bold text-white mt-0.5">{selectedCourse.name}</h3>
          </div>
          <div className="h-6 w-px bg-white/5 hidden sm:block"></div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Estudiantes del Curso</p>
            <p className="text-xs font-semibold text-gray-300 mt-0.5">
              Total: {students.length} | <span className="text-brand-amber font-bold">Rezagados: {laggingStudents.length}</span>
            </p>
          </div>
          <div className="h-6 w-px bg-white/5 hidden sm:block"></div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Auto-Inscripción</p>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border inline-block mt-0.5 ${
              selectedCourse.inscriptionsStatus === "open"
                ? "bg-brand-emerald/10 text-brand-emerald border-brand-emerald/10"
                : "bg-brand-rose/10 text-brand-rose border-brand-rose/10"
            }`}>
              {selectedCourse.inscriptionsStatus === "open" ? "Abierta" : "Cerrada"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedCourse.inscriptionsStatus === "open" ? (
            <button
              onClick={() => handleToggleInscriptions("closed")}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-white/5 rounded-xl text-[11px] font-semibold text-gray-200 transition-all cursor-pointer"
            >
              Cerrar Inscripción
            </button>
          ) : (
            <button
              onClick={() => handleToggleInscriptions("open")}
              className="px-2.5 py-1.5 bg-brand-emerald text-white rounded-xl text-[11px] font-semibold hover:bg-brand-emerald/90 transition-all cursor-pointer shadow-md shadow-brand-emerald/20"
            >
              Abrir Inscripción
            </button>
          )}

          {selectedCourse.inscriptionsStatus === "open" && laggingStudents.length > 0 && (
            <button
              disabled={loadingAutoComplete || !canCloseInscriptions}
              onClick={handleAutoComplete}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-black text-[11px] font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="w-3 h-3" />
              {loadingAutoComplete ? "Asignando..." : "Auto-completar"}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {autoCompleteError && (
        <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{autoCompleteError}</span>
        </div>
      )}

      {/* Grid de Grupos / Proyectos */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-brand-purple" />
          Distribución de Grupos y Proyectos
        </h3>
        <p className="text-[11px] text-gray-400">Selecciona un grupo para matricular alumnos o editarlos.</p>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-1 custom-scrollbar">
        {projects.length === 0 ? (
          <div className="p-12 text-center bg-[#121214] border border-white/5 rounded-2xl text-gray-400">
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No hay grupos configurados</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Ve a la pestaña "Grupos / Proyectos" en el menú lateral para crear los equipos de trabajo para este curso.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {projects.map((project) => {
              const isEditing = editingProjectId === project.id;
              const fillPercentage = Math.min((project.members.length / project.max_members) * 100, 100);
              return (
                <div
                  key={project.id}
                  onClick={() => {
                    if (!isEditing) {
                      setSearchAvailableQuery("");
                      setSelectedProjectForModal(project);
                    }
                  }}
                  className={`p-5 bg-[#121214] border rounded-2xl flex flex-col justify-between h-[220px] cursor-pointer transition-all duration-200 hover:border-brand-purple/25 hover:bg-white/1 relative group ${
                    isEditing ? "border-white/20 bg-zinc-950" : "border-white/5 hover:shadow-lg hover:shadow-brand-purple/5"
                  }`}
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveProjectEdit(e, project.id)}
                      className="space-y-2 w-full h-full flex flex-col justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-2">
                        <label className="text-[9px] text-gray-500 uppercase font-semibold block">Nombre del Grupo</label>
                        <input
                          type="text"
                          required
                          value={editProjectName}
                          onChange={(e) => setEditProjectName(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-white rounded px-2.5 py-1.5 focus:outline-none"
                          placeholder="Nombre del Grupo"
                        />
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] text-gray-500 uppercase font-semibold">Cupo Máximo</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            required
                            value={editProjectCapacity}
                            onChange={(e) => setEditProjectCapacity(parseInt(e.target.value) || 1)}
                            className="w-16 text-xs bg-zinc-900 border border-white/5 text-white rounded px-1.5 py-0.5 text-center focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingProjectId(null)}
                          className="px-2 py-0.5 text-[9px] bg-zinc-800 text-gray-400 rounded cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-2 py-0.5 text-[9px] bg-white text-black font-bold rounded cursor-pointer"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="w-full space-y-3">
                        <div className="flex justify-between items-start pb-2 border-b border-white/5">
                          <h4 className="font-bold text-white text-sm truncate max-w-[140px] group-hover:text-brand-purple transition-all" title={project.name}>
                            {project.name}
                          </h4>
                          <span className={`text-[9px] py-0.5 px-1.5 rounded font-bold border ${
                            project.members.length >= project.max_members
                              ? "bg-brand-rose/10 text-brand-rose border-brand-rose/10"
                              : "bg-white/5 text-gray-400 border-white/5"
                          }`}>
                            {project.members.length} / {project.max_members}
                          </span>
                        </div>

                        {/* Visual Progress Bar (Ocupación) */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-gray-500 uppercase font-semibold">
                            <span>Ocupación</span>
                            <span>{fillPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 rounded-full h-1 border border-white/5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                fillPercentage === 100 ? "bg-brand-rose" : "bg-brand-purple"
                              }`}
                              style={{ width: `${fillPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-400">
                          {project.members.length === 0 ? (
                            <p className="text-[10px] text-gray-500 italic">Grupo vacío. Haz clic para matricular alumnos.</p>
                          ) : (
                            <p className="text-[10px] text-gray-300 truncate">
                              Integrantes: {project.members.map((mId) => students.find((s) => s.id === mId)?.nombre_completo).filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5 w-full text-[10px]" onClick={(e) => e.stopPropagation()}>
                        <span className="text-brand-purple font-semibold hover:underline">Administrar alumnos ➜</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditProject(project)}
                            className="p-1 bg-white/2 border border-white/5 text-gray-400 rounded hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-1 bg-white/2 border border-white/5 text-gray-500 rounded hover:text-brand-rose hover:border-brand-rose/25 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VENTANA MODAL PARA MATRICULACIÓN (Fila de Integrantes + Cuadrícula de Estudiantes Disponibles) */}
      {selectedProjectForModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] max-h-[580px] flex flex-col overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Modal */}
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-zinc-900/30">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Matriculación y Asignación de Grupo</h3>
                <p className="text-sm text-brand-purple font-bold mt-0.5">{selectedProjectForModal.name}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`text-xs py-1 px-3 rounded-full font-bold border ${
                  selectedProjectForModal.members.length >= selectedProjectForModal.max_members
                    ? "bg-brand-rose/10 text-brand-rose border-brand-rose/10"
                    : "bg-brand-emerald/10 text-brand-emerald border-brand-emerald/10"
                }`}>
                  Integrantes: {selectedProjectForModal.members.length} de {selectedProjectForModal.max_members} cupos ocupados
                </span>
                
                <button
                  onClick={() => setSelectedProjectForModal(null)}
                  className="text-gray-400 hover:text-white transition-all text-xs font-semibold flex items-center gap-1 bg-white/5 px-2.5 py-1.5 border border-white/5 rounded-xl cursor-pointer"
                >
                  Cerrar <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contenido Modal */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col gap-5">
              {/* Sección Superior: Integrantes actuales del Grupo (Horizontal badges) */}
              <div className="flex-shrink-0">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">
                  Integrantes Actuales ({selectedProjectForModal.members.length})
                </p>
                <div className="flex flex-wrap gap-2 p-3 bg-zinc-950 border border-white/5 rounded-xl min-h-[50px] max-h-[85px] overflow-y-auto custom-scrollbar">
                  {selectedProjectForModal.members.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-1">Sin integrantes asignados. Haz clic en los alumnos disponibles abajo para agregarlos.</p>
                  ) : (
                    selectedProjectForModal.members.map((memberId) => {
                      const st = students.find((s) => s.id === memberId);
                      return (
                        <div
                          key={memberId}
                          className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-lg text-xs font-semibold"
                        >
                          <span>{st ? st.nombre_completo : "Alumno"}</span>
                          <button
                            onClick={() => handleRemoveStudent(memberId, selectedProjectForModal.id)}
                            className="p-0.5 hover:bg-brand-purple/20 rounded-md transition-all text-brand-purple hover:text-white cursor-pointer"
                            title="Quitar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sección Inferior: Listado de Estudiantes Disponibles (CUADRÍCULA RESPONSIVA MULTI-COLUMNA) */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    Estudiantes Disponibles para Matricular ({filteredAvailableStudents.length})
                  </p>
                  <input
                    type="text"
                    placeholder="Buscar estudiante disponible..."
                    value={searchAvailableQuery}
                    onChange={(e) => setSearchAvailableQuery(e.target.value)}
                    className="text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-white placeholder-gray-600 w-64"
                  />
                </div>

                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredAvailableStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 border border-dashed border-white/5 rounded-xl h-full">
                      <Users className="w-8 h-8 text-gray-700 mb-2 animate-pulse" />
                      <p className="text-xs font-semibold text-white">No hay alumnos disponibles</p>
                      <p className="text-[10px] text-gray-400 mt-1">Todos los alumnos del curso ya pertenecen a un grupo o no coinciden con la búsqueda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredAvailableStudents.map((student) => {
                        const isFull = selectedProjectForModal.members.length >= selectedProjectForModal.max_members;
                        return (
                          <div
                            key={student.id}
                            onClick={() => {
                              if (!isFull) {
                                handleAddStudent(student.id, selectedProjectForModal.id);
                              }
                            }}
                            className={`p-2.5 bg-white/2 border rounded-xl hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-all text-left flex flex-col justify-between h-[65px] select-none group relative ${
                              isFull ? "opacity-45 cursor-not-allowed border-white/2" : "border-white/5 cursor-pointer"
                            }`}
                          >
                            <div className="truncate">
                              <p className="font-semibold text-white truncate text-[11px] group-hover:text-brand-purple transition-all">
                                {student.nombre_completo}
                              </p>
                              <p className="text-[9px] text-gray-500 mt-0.5">CC: {student.codigo_estudiante}</p>
                            </div>
                            <div className="flex justify-end mt-1">
                              <span className="text-[8px] text-brand-purple font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5">
                                Matricular <Plus className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// VISTA 2: STUDENT REGISTRY (MENÚ INDEPENDIENTE DE MATRÍCULA Y CRUD DE ALUMNOS)
// =========================================================================
export const StudentRegistry: React.FC = () => {
  const { selectedCourse, refreshCourses } = useDashboard();

  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showImporter, setShowImporter] = useState(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Edición de Estudiante
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentCode, setEditStudentCode] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");

  const loadData = async () => {
    if (!selectedCourse) return;
    try {
      const [studentList, projectList] = await Promise.all([
        studentService.getStudents(selectedCourse.id),
        projectService.getProjects(selectedCourse.id),
      ]);
      setStudents(studentList);
      setProjects(projectList);
      if (studentList.length === 0) {
        setShowImporter(true);
      }
    } catch (e) {
      console.error("Error al cargar matrícula:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourse]);

  // Eliminar Estudiante
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar permanentemente a este estudiante del curso?")) return;
    try {
      await studentService.deleteStudent(studentId);
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Error al eliminar estudiante");
    }
  };

  // Guardar Edición Estudiante
  const handleStartEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setEditStudentName(student.nombre_completo);
    setEditStudentCode(student.codigo_estudiante);
    setEditStudentEmail(student.correo_institucional);
    setEditStudentPhone(student.telefono || "");
  };

  const handleSaveStudentEdit = async (e: React.FormEvent, studentId: string) => {
    e.preventDefault();
    try {
      await studentService.updateStudent(studentId, {
        nombre_completo: editStudentName.trim(),
        codigo_estudiante: editStudentCode.trim(),
        correo_institucional: editStudentEmail.trim().toLowerCase(),
        telefono: editStudentPhone.trim(),
      });
      setEditingStudentId(null);
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Error al actualizar estudiante");
    }
  };

  const filteredAllStudents = students.filter(
    (s) =>
      s.nombre_completo.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
      s.codigo_estudiante.includes(searchStudentQuery)
  );

  if (!selectedCourse) {
    return (
      <div className="p-8 text-center bg-zinc-900 border border-white/5 rounded-2xl glass-panel text-gray-400">
        Por favor, seleccione un curso en la pestaña "Cursos" para administrar su matrícula.
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-full animate-fade-in">
      {/* cabecera y barra de control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] p-4 border border-white/5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-gray-400" />
            Matrícula General de Estudiantes
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Curso Activo: <span className="text-white font-semibold">{selectedCourse.name}</span> | Alumnos registrados: <span className="text-white font-bold">{students.length}</span>
          </p>
        </div>

        <button
          onClick={() => setShowImporter(!showImporter)}
          className={`px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            showImporter
              ? "bg-white text-black border-white"
              : "bg-zinc-800 hover:bg-zinc-700 text-gray-200 border-white/5"
          }`}
        >
          {showImporter ? "Ocultar Carga Masiva" : "Cargar Estudiantes (Excel / JSON)"}
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Panel Importador Colapsable */}
      {showImporter && (
        <div className="p-4 bg-[#121214] border border-white/5 rounded-2xl shadow-sm animate-slide-down">
          <StudentImporter
            courseId={selectedCourse.id}
            onImportSuccess={() => {
              loadData();
              setShowImporter(false);
            }}
          />
        </div>
      )}

      {/* Historial de Alumnos Matriculados */}
      <div className="p-5 bg-[#121214] border border-white/5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Base de Datos Académica
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Modifica o elimina registros académicos en el curso.</p>
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre o CC..."
            value={searchStudentQuery}
            onChange={(e) => setSearchStudentQuery(e.target.value)}
            className="text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-white placeholder-gray-600 w-full sm:w-64"
          />
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar space-y-2 pr-1">
          {filteredAllStudents.length === 0 ? (
            <p className="text-xs text-gray-500 italic text-center py-8">No se encontraron estudiantes registrados.</p>
          ) : (
            filteredAllStudents.map((student) => {
              const isEditing = editingStudentId === student.id;
              const belongsToProj = projects.find((p) => p.id === student.projectId);
              return (
                <div
                  key={student.id}
                  className={`p-3 bg-white/2 border rounded-xl flex flex-col gap-2 transition-all select-none group ${
                    isEditing ? "border-white/20 bg-zinc-950" : "border-white/5 hover:border-white/10"
                  }`}
                >
                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveStudentEdit(e, student.id)} className="space-y-1.5 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={editStudentName}
                          onChange={(e) => setEditStudentName(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-white rounded px-2.5 py-1.5 focus:outline-none"
                          placeholder="Nombre Completo"
                        />
                        <input
                          type="text"
                          required
                          value={editStudentCode}
                          onChange={(e) => setEditStudentCode(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-white rounded px-2.5 py-1.5 focus:outline-none"
                          placeholder="Documento/Código"
                        />
                        <input
                          type="email"
                          required
                          value={editStudentEmail}
                          onChange={(e) => setEditStudentEmail(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-white rounded px-2.5 py-1.5 focus:outline-none"
                          placeholder="Correo Electrónico"
                        />
                        <input
                          type="text"
                          value={editStudentPhone}
                          onChange={(e) => setEditStudentPhone(e.target.value)}
                          className="w-full text-xs bg-zinc-900 border border-white/5 text-white rounded px-2.5 py-1.5 focus:outline-none"
                          placeholder="Teléfono (Opcional)"
                        />
                      </div>
                      <div className="flex justify-end gap-1 pt-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingStudentId(null)}
                          className="px-2.5 py-1 bg-zinc-800 text-gray-400 rounded text-xs cursor-pointer hover:bg-zinc-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-white text-black font-bold rounded text-xs cursor-pointer hover:bg-gray-200"
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white truncate text-xs">{student.nombre_completo}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                            belongsToProj
                              ? "bg-brand-purple/10 text-brand-purple border-brand-purple/10"
                              : "bg-brand-amber/10 text-brand-amber border-brand-amber/10"
                          }`}>
                            {belongsToProj ? `Grupo: ${belongsToProj.name}` : "Rezagado"}
                          </span>
                        </div>
                        <div className="flex gap-4 text-[10px] text-gray-400 mt-1">
                          <span>CC: <span className="text-gray-300 font-medium">{student.codigo_estudiante}</span></span>
                          <span>Correo: <span className="text-gray-300 font-medium">{student.correo_institucional}</span></span>
                          {student.telefono && (
                            <span>Tel: <span className="text-gray-300 font-medium">{student.telefono}</span></span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditStudent(student)}
                          className="p-1 bg-white/2 border border-white/5 text-gray-400 rounded hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Editar estudiante"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-1 bg-white/2 border border-white/5 text-gray-500 rounded hover:text-brand-rose hover:border-brand-rose/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Eliminar estudiante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
