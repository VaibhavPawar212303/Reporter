'use client';

import React, { useEffect, useState } from "react";
import { Command, ChevronRight, Monitor, Plus, Loader2, Database, X, Shield } from "lucide-react";
import { getProjects } from "@/lib/actions"; 
import { RegisterProjectModal } from "./_components/RegisterProjectModal";
import { ProjectCard } from "./_components/ProjectCard";

export default function ProjectsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getProjects();
      setData(res);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#0c0c0e]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Syncing_Registry...</span>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-10 bg-[#0c0c0e] min-h-screen font-mono selection:bg-indigo-500/30">
      
      {/* 1. HEADER SECTION */}
      <header className="flex justify-between items-center border-b border-zinc-800 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <Command size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tighter uppercase leading-none">Project Registry</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">
              Global Infrastructure • {data.length} Registered_Objects
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all rounded-none shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          <Plus size={16} strokeWidth={3} />
          Register Project
        </button>
      </header>

      {/* 2. PROJECT CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {data.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {/* Empty State / Add New Placeholder */}
        {data.length === 0 && (
          <div className="col-span-full py-20 border border-dashed border-zinc-800 flex flex-col items-center justify-center opacity-30">
            <Database size={40} className="mb-4" />
            <p className="text-xs uppercase font-bold tracking-widest">No Projects Found In Registry</p>
          </div>
        )}
      </div>

      {/* 3. MODAL INTEGRATION */}
      <RegisterProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadData}
      />
    </div>
  );
}
