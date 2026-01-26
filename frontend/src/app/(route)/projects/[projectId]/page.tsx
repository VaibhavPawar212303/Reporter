'use client';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Zap, Book, ChevronRight, Loader2, Command, Server, Box } from "lucide-react";
import { getProjectById } from "@/lib/actions";
import { cn } from "@/lib/utils";

export default function ProjectSelectionPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    getProjectById(Number(projectId)).then(setProject);
  }, [projectId]);

  if (!project) return (
    <div className="h-screen flex items-center justify-center bg-[#0c0c0e]">
      <Loader2 className="animate-spin text-zinc-500 w-8 h-8" />
    </div>
  );

  return (
    <div className="p-8 space-y-10 font-mono bg-[#0c0c0e] min-h-screen">
      {/* 1. HEADER & BREADCRUMBS */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
          <Server size={12} />
          <span>Infrastructure</span>
          <span className="text-zinc-800">/</span>
          <span>Registry</span>
          <span className="text-zinc-800">/</span>
          <span className="text-zinc-300">{project.name.replace(/ /g, '_')}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <Command size={24} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter uppercase">Resource Control</h1>
        </div>
      </header>

      {/* 2. SELECTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
        <SelectionCard 
          href={`/projects/${projectId}/automation`}
          title="Automated Instance"
          sub={`${project.type.toUpperCase()} execution pipeline and regression results`}
          icon={<Zap size={24} />}
          color="indigo"
          badge="Live_Stream"
        />

        <SelectionCard 
          href={`/test-cases`} 
          title="Manual Repository"
          sub="Master test case registry and manual verification logs"
          icon={<Book size={24} />}
          color="emerald"
          badge="Registry_v4"
        />
      </div>
    </div>
  );
}

function SelectionCard({ href, title, sub, icon, color, badge }: any) {
  const colors: any = { indigo: 'border-t-indigo-500', emerald: 'border-t-emerald-500' };

  return (
    <Link href={href} className={cn(
      "group bg-[#111114] border border-zinc-800 border-t-2 p-10 flex flex-col justify-between min-h-[320px] transition-all hover:bg-zinc-900 shadow-sm relative overflow-hidden",
      colors[color]
    )}>
      <div className="flex justify-between items-start">
        <div className="text-zinc-500 group-hover:text-white transition-colors">
          {icon}
        </div>
        <span className="text-[8px] font-black px-2 py-0.5 border border-zinc-800 text-zinc-600 uppercase tracking-widest">
          {badge}
        </span>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-white uppercase tracking-tighter mb-3 group-hover:text-indigo-400 transition-colors">
          {title}
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-[300px] uppercase font-bold tracking-tight">
          {sub}
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] group-hover:text-white transition-colors pt-6 border-t border-zinc-800/50">
        Initiate Handshake <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
      </div>
    </Link>
  );
}