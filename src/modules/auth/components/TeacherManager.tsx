"use client";

import React, { useState, useEffect } from "react";
import { userService, UserAccount } from "../../shared/services/firebase";
import { Plus, Users, UserPlus, AlertCircle, CheckCircle, Mail, Key, User } from "lucide-react";

export function TeacherManager() {
  const [teachers, setTeachers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const list = await userService.getUsers("docente");
      setTeachers(list);
    } catch (e) {
      console.error("Error al cargar docentes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    if (!trimmedName || !trimmedEmail || !trimmedCode) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("El correo institucional no es válido.");
      return;
    }

    setSubmitLoading(true);
    try {
      // Validar si ya existe
      const allUsers = await userService.getUsers();
      if (allUsers.some((u) => u.email.toLowerCase() === trimmedEmail)) {
        throw new Error("El correo ingresado ya se encuentra registrado.");
      }

      const newTeacher: UserAccount = {
        id: trimmedEmail,
        email: trimmedEmail,
        name: trimmedName,
        code: trimmedCode,
        role: "docente"
      };

      await userService.createUser(newTeacher);
      setSuccess(`Docente "${trimmedName}" registrado con éxito.`);
      
      // Limpiar formulario
      setName("");
      setEmail("");
      setCode("");
      
      // Recargar lista
      await loadTeachers();
    } catch (err: any) {
      setError(err.message || "Error al registrar el docente.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          Gestión de Docentes
        </h1>
        <p className="text-xs text-gray-400">
          Registra y administra las cuentas de los profesores encargados de los cursos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro */}
        <div className="lg:col-span-1 p-5 bg-zinc-900 border border-white/5 rounded-2xl glass-panel space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gray-400" />
            Registrar Nuevo Docente
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-xl text-xs flex items-center gap-2 animate-slide-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-[11px] leading-normal">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald rounded-xl text-xs flex items-center gap-2 animate-slide-up">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-[11px] leading-normal">{success}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">
                Nombre Completo
              </label>
              <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-3 py-2">
                <User className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Ej. Ing. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 text-xs bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">
                Correo Institucional
              </label>
              <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-3 py-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  placeholder="juan.perez@institucion.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-xs bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">
                Código / Contraseña de Acceso
              </label>
              <div className="flex items-center gap-2 bg-[#18181b] border border-white/5 rounded-xl px-3 py-2">
                <Key className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Ej. DOC101 o clave secreta"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 text-xs bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-white text-[#09090b] text-xs font-bold rounded-xl hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {submitLoading ? "Registrando..." : "Registrar Docente"}
            </button>
          </form>
        </div>

        {/* Listado de Docentes */}
        <div className="lg:col-span-2 p-5 bg-zinc-900 border border-white/5 rounded-2xl glass-panel space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Docentes Registrados ({teachers.length})
          </h3>

          {loading ? (
            <div className="text-center py-10 text-xs text-gray-500">Cargando docentes...</div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500 italic">
              No hay docentes registrados en el sistema. Usa el formulario de la izquierda para registrar el primero.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-400">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-gray-500">
                    <th className="py-2.5">Nombre</th>
                    <th className="py-2.5">Correo Institucional</th>
                    <th className="py-2.5 text-right">Código de Acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teachers.map((t) => (
                    <tr key={t.email} className="hover:bg-white/2">
                      <td className="py-3 font-semibold text-white">{t.name}</td>
                      <td className="py-3">{t.email}</td>
                      <td className="py-3 text-right font-mono text-gray-300">{t.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
