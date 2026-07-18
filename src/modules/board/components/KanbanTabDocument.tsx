import React from "react";
import { Project } from "../../shared/services/firebase";

interface KanbanTabDocumentProps {
  activeProject: Project | null | undefined;
}

export const KanbanTabDocument: React.FC<KanbanTabDocumentProps> = ({ activeProject }) => {
  return (
    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm animate-fade-in max-w-4xl mx-auto mt-6">
      <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider mb-8 text-center border-b border-zinc-800 pb-4">
        Generalidades del Proyecto
      </h2>
      
      <div className="space-y-10">
        {activeProject?.construction?.introduction && (
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-zinc-200 border-l-4 border-brand-purple pl-3">Introducción</h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap text-justify">
              {activeProject.construction.introduction}
            </p>
          </section>
        )}
        
        {activeProject?.construction?.purpose && (
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-zinc-200 border-l-4 border-brand-purple pl-3">Propósito</h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap text-justify">
              {activeProject.construction.purpose}
            </p>
          </section>
        )}
        
        {activeProject?.construction?.objectives && (
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-zinc-200 border-l-4 border-brand-purple pl-3">Objetivos</h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap text-justify">
              {activeProject.construction.objectives}
            </p>
          </section>
        )}
      </div>
    </div>
  );
};
