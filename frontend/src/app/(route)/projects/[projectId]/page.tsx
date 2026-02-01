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
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-muted w-6 h-6" />
    </div>
  );

  return (
    <div className="p-8 space-y-8 font-mono bg-background min-h-screen transition-colors duration-300">
      {/* 1. HEADER & BREADCRUMBS */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
          <Server size={12} />
          <span>Infrastructure</span>
          <span className="opacity-30">/</span>
          <span>Registry</span>
          <span className="opacity-30">/</span>
          <span className="text-foreground">{project.name.replace(/ /g, '_')}</span>
        </div>

        <div className="flex items-center gap-4 border-b border-border pb-6">
          <div className="w-10 h-10 bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <Command size={22} />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tighter uppercase leading-none">Resource Control</h1>
        </div>
      </header>

      {/* 2. SELECTION GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <SelectionCard 
          href={`/projects/${projectId}/automation`}
          title="Automated Instance"
          sub={`${project.type.toUpperCase()} EXEC_PIPELINE`}
          icon={<Zap size={16} />}
          color="indigo"
          badge="Live"
        />

        <SelectionCard 
           href={`/projects/${projectId}/manual`}
          title="Manual Repository"
          sub="MASTER_REGISTRY_V4"
          icon={<Book size={16} />}
          color="emerald"
          badge="Stable"
        />
      </div>

      {/* 3. SYSTEM METADATA FOOTER */}
      <div className="flex items-center gap-4 pt-4">
         <div className="h-[1px] flex-1 bg-border" />
         <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em] opacity-40">Project_ID: {projectId}</span>
         <div className="h-[1px] flex-1 bg-border" />
      </div>
    </div>
  );
}

function SelectionCard({ href, title, sub, icon, color, badge }: any) {
  const colors: any = { 
    indigo: 'border-t-indigo-500', 
    emerald: 'border-t-emerald-500' 
  };

  return (
    <Link href={href} className={cn(
      "group bg-card border border-border border-t-2 p-6 flex flex-col justify-between min-h-[200px] transition-all hover:bg-muted/5 shadow-sm relative overflow-hidden",
      colors[color]
    )}>
      {/* Top row */}
      <div className="flex justify-between items-start">
        <div className="text-muted group-hover:text-foreground transition-colors">
          {icon}
        </div>
        <span className="text-[8px] font-black px-1.5 py-0.5 border border-border bg-background/50 text-muted uppercase tracking-widest">
          {badge}
        </span>
      </div>

      {/* Middle row */}
      <div className="mt-4">
        <p className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-1">{sub}</p>
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight group-hover:text-indigo-500 transition-colors">
          {title}
        </h2>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
        <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em] group-hover:text-foreground/60 transition-colors">
           Access_Module
        </span>
        <div className="w-7 h-7 flex items-center justify-center border border-border bg-card group-hover:bg-foreground group-hover:border-foreground transition-all">
            <ChevronRight size={14} className="text-muted group-hover:text-background" />
        </div>
      </div>

      {/* Left-edge health strip */}
      <div className={cn(
        "absolute left-0 top-8 bottom-8 w-[1px] opacity-0 group-hover:opacity-100 transition-all duration-300",
        color === 'indigo' ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
      )} />
    </Link>
  );
}