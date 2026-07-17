"use client";

import React, { useState } from "react";
import { useDashboard } from "../../shared/components/Layout";
import { useCourses } from "../hooks/useCourses";
import { Course } from "../../shared/services/firebase";
import {
  Plus,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  AlertCircle
} from "lucide-react";

export const CourseManager: React.FC = () => {
  const { selectedCourse, setSelectedCourse, courses, refreshCourses } = useDashboard();
  const { createCourse, updateCourse, deleteCourse, error: courseError } = useCourses();

  // Estados para Modal de Creación
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseSede, setNewCourseSede] = useState("");
  const [newCourseDia, setNewCourseDia] = useState("");
  const [newCourseHorario, setNewCourseHorario] = useState("");
  const [newCourseFechaInicio, setNewCourseFechaInicio] = useState("");
  const [newCourseFechaFin, setNewCourseFechaFin] = useState("");

  // Estados para Modal de Edición
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseSede, setEditCourseSede] = useState("");
  const [editCourseDia, setEditCourseDia] = useState("");
  const [editCourseHorario, setEditCourseHorario] = useState("");
  const [editCourseFechaInicio, setEditCourseFechaInicio] = useState("");
  const [editCourseFechaFin, setEditCourseFechaFin] = useState("");

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newCourseName.trim() ||
      !newCourseSede.trim() ||
      !newCourseDia.trim() ||
      !newCourseHorario.trim() ||
      !newCourseFechaInicio.trim() ||
      !newCourseFechaFin.trim()
    ) {
      return;
    }

    const course = await createCourse(
      newCourseName.trim(),
      newCourseSede.trim(),
      newCourseDia.trim(),
      newCourseHorario.trim(),
      newCourseFechaInicio,
      newCourseFechaFin
    );

    if (course) {
      // Limpiar campos
      setNewCourseName("");
      setNewCourseSede("");
      setNewCourseDia("");
      setNewCourseHorario("");
      setNewCourseFechaInicio("");
      setNewCourseFechaFin("");
      setIsCreateModalOpen(false);
      
      await refreshCourses();
      setSelectedCourse(course);
    }
  };

  const handleStartEdit = (course: Course) => {
    setEditingCourse(course);
    setEditCourseName(course.name);
    setEditCourseSede(course.sede || "");
    setEditCourseDia(course.dia || "");
    setEditCourseHorario(course.horario || "");
    setEditCourseFechaInicio(course.fechaInicio || "");
    setEditCourseFechaFin(course.fechaFin || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const success = await updateCourse(editingCourse.id, {
      name: editCourseName.trim(),
      sede: editCourseSede.trim(),
      dia: editCourseDia.trim(),
      horario: editCourseHorario.trim(),
      fechaInicio: editCourseFechaInicio,
      fechaFin: editCourseFechaFin,
    });

    if (success) {
      setEditingCourse(null);
      await refreshCourses();
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation(); // Evitar seleccionar el curso al hacer clic en borrar
    if (
      !confirm(
        "¿Está seguro de que desea eliminar este curso? Se borrarán en cascada permanentemente todos los estudiantes matriculados, grupos y tableros Kanban de este curso."
      )
    ) {
      return;
    }

    const success = await deleteCourse(courseId);
    if (success) {
      await refreshCourses();
      // Si el curso borrado era el seleccionado, limpiar selección
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-gray-400" />
            Gestión de Cursos Académicos
          </h2>
          <p className="text-xs text-gray-400">
            Administra tus asignaturas de Metodologías Ágiles, sedes, horarios y ciclos académicos.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-gray-250 transition-all cursor-pointer shadow-md self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Nuevo Curso
        </button>
      </div>

      {courseError && (
        <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{courseError}</span>
        </div>
      )}

      {/* Listado de Cursos con Cards Rediseñadas Grandes */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Cursos Registrados ({courses.length})
        </h3>

        {courses.length === 0 ? (
          <div className="p-12 text-center bg-[#121214] border border-white/5 rounded-2xl text-gray-400">
            <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">Aún no hay cursos creados</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Haz clic en el botón "Nuevo Curso" de arriba para instanciar tu primera materia académica.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => {
              const isSelected = selectedCourse?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCourse(c)}
                  className={`p-6 bg-[#121214] border rounded-2xl flex flex-col justify-between min-h-[230px] cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                    isSelected
                      ? "border-brand-purple bg-brand-purple/2 shadow-lg shadow-brand-purple/5"
                      : "border-white/5 hover:border-white/10 hover:bg-white/1 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-purple/2"
                  }`}
                >
                  {/* Glowing Top Line on Hover */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

                  {/* Header de la tarjeta */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-bold text-white text-base truncate group-hover:text-brand-purple transition-all pr-12" title={c.name}>
                        {c.name}
                      </h4>

                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Editar */}
                        <button
                          onClick={() => handleStartEdit(c)}
                          className="p-1 bg-white/2 border border-white/5 text-gray-400 rounded-lg hover:text-white hover:border-white/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Editar Curso"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* Eliminar */}
                        <button
                          onClick={(e) => handleDeleteClick(e, c.id)}
                          className="p-1 bg-white/2 border border-white/5 text-gray-500 rounded-lg hover:text-brand-rose hover:border-brand-rose/20 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Eliminar Curso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-500">ID: {c.id.slice(0, 8)}</p>
                  </div>

                  {/* Detalles del curso */}
                  <div className="space-y-2 border-t border-white/5 pt-4 w-full">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">
                        Sede: <span className="text-gray-200 font-semibold">{c.sede}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">
                        Horario: <span className="text-gray-200 font-semibold">{c.dia || "Lunes"} | {c.horario}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">
                        Periodo: <span className="text-gray-200 font-semibold">{c.fechaInicio} al {c.fechaFin}</span>
                      </span>
                    </div>
                  </div>

                  {/* Footer de la tarjeta */}
                  <div className="w-full flex justify-between items-center text-[10px] text-gray-500 pt-3 border-t border-white/5 mt-3">
                    <span className="flex items-center gap-1">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-brand-purple font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Seleccionado
                        </span>
                      ) : (
                        <span className="text-gray-600">Hacer clic para activar</span>
                      )}
                    </span>

                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                      c.inscriptionsStatus === "open"
                        ? "bg-brand-emerald/10 text-brand-emerald border-brand-emerald/10"
                        : "bg-white/5 text-gray-500 border-white/5"
                    }`}>
                      Inscripciones: {c.inscriptionsStatus === "open" ? "Abiertas" : "Cerradas"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VENTANA MODAL PARA CREACIÓN DE CURSO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-zinc-900/30">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-brand-purple" />
                Registrar Nuevo Curso
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario Modal */}
            <form onSubmit={handleCreateCourse} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-semibold block">Nombre del Curso</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ingeniería de Software II"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-white placeholder-gray-650"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Sede / Campus</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Campus Norte"
                    value={newCourseSede}
                    onChange={(e) => setNewCourseSede(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-white placeholder-gray-650"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Día de Clase</label>
                  <select
                    required
                    value={newCourseDia}
                    onChange={(e) => setNewCourseDia(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-white cursor-pointer"
                  >
                    <option value="" disabled>Seleccione...</option>
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-semibold block">Horario (Ej: 18:00 - 20:00)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 18:00 - 20:00"
                  value={newCourseHorario}
                  onChange={(e) => setNewCourseHorario(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-white placeholder-gray-655"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={newCourseFechaInicio}
                    onChange={(e) => setNewCourseFechaInicio(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={newCourseFechaFin}
                    onChange={(e) => setNewCourseFechaFin(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-gray-400 rounded-lg text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-gray-250 cursor-pointer shadow-sm"
                >
                  Crear Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENTANA MODAL PARA EDICIÓN DE CURSO */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-zinc-900/30">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-brand-purple" />
                Editar Curso Académico
              </h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="text-gray-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario Modal */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-semibold block">Nombre del Curso</label>
                <input
                  type="text"
                  required
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Sede / Campus</label>
                  <input
                    type="text"
                    required
                    value={editCourseSede}
                    onChange={(e) => setEditCourseSede(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Día de Clase</label>
                  <select
                    required
                    value={editCourseDia}
                    onChange={(e) => setEditCourseDia(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-semibold block">Horario</label>
                <input
                  type="text"
                  required
                  value={editCourseHorario}
                  onChange={(e) => setEditCourseHorario(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={editCourseFechaInicio}
                    onChange={(e) => setEditCourseFechaInicio(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={editCourseFechaFin}
                    onChange={(e) => setEditCourseFechaFin(e.target.value)}
                    className="w-full text-xs bg-zinc-950 border border-white/5 text-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 bg-zinc-800 text-gray-400 rounded-lg text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-gray-250 cursor-pointer shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
