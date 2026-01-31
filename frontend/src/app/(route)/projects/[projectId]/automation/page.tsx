'use client';
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBuildsByProjectAndType, getProjectById } from "@/lib/actions";
import { Loader2, Activity, Calendar, Box, ChevronRight, Clock, Shield, Server } from "lucide-react";
import { StatusBadge } from "@/app/(route)/cypress/_components/StatusBadge";
import { cn } from "@/lib/utils";

export default function ProjectAutomationPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [builds, setBuilds] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const proj = await getProjectById(Number(projectId));
        
        if (proj && !('error' in proj)) {
          setProject(proj);
          const bld = await getBuildsByProjectAndType(Number(projectId), proj.type);

          if (Array.isArray(bld)) {
            setBuilds(bld);
          } else {
            console.error("Fetch builds error:", bld.error);
            setBuilds([]);
          }
        }
      } catch (error) {
        console.error("Critical Registry Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchData();
  }, [projectId]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
        <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em] animate-pulse">Establishing_Handshake...</span>
      </div>
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
          <span>{project?.name?.replace(/ /g, '_') || 'PROJECT_ROOT'}</span>
          <span className="opacity-30">/</span>
          <span className="text-foreground">Automation_Registry</span>
        </div>

        <div className="flex justify-between items-end border-b border-border pb-4">
            <div>
                {/* Removed 'italic' class as requested */}
                <h1 className="text-4xl font-bold text-foreground uppercase tracking-tighter">Instance History</h1>
                <p className="text-[10px] text-muted mt-2 font-bold tracking-widest uppercase">
                  TYPE: <span className="text-indigo-500">{project?.type}</span> • UUID: {projectId}
                </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-muted uppercase border border-border px-3 py-1 bg-card/50">
                Pipeline: <span className="text-emerald-500 ml-1">STABLE_CHANNEL</span>
            </div>
        </div>
      </header>

      {/* 2. AUTOMATION BUILD LIST */}
      <div className="bg-card border border-border shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Activity size={14} className="text-indigo-500" />
             <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                Aggregated Execution Log
             </span>
          </div>
          <span className="text-[9px] text-muted font-bold uppercase tracking-widest border border-border px-2 py-0.5">
            Objects: {builds.length}
          </span>
        </div>

        <div className="divide-y divide-border/50">
          {builds.map((b) => (
            <div 
              key={`build-${b.id}`} 
              onClick={() => router.push(`/${project.type.toLowerCase()}?projectId=${projectId}&buildId=${b.id}`)}
              className="group flex items-center justify-between p-6 hover:bg-muted/5 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-1 h-10 transition-all duration-500",
                  b.status === 'passed' ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : 
                  b.status === 'failed' ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]" : "bg-amber-500"
                )} />

                <div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-indigo-500 transition-colors uppercase tabular-nums tracking-tight">
                    Build_Reference_{b.id}
                  </h3>
                  <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Calendar size={10} className="opacity-50"/> {new Date(b.createdAt).toLocaleDateString()}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span className="flex items-center gap-1.5"><Clock size={10} className="opacity-50"/> {b.environment}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span className="opacity-70">{b.type} instance</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="hidden md:block text-right">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">Architecture</p>
                    <div className="flex items-center gap-1 text-muted font-bold text-[10px] uppercase tracking-tighter">
                       <Shield size={10} className="opacity-40" /> x86_64 Stable
                    </div>
                </div>
                <StatusBadge status={b.status} />
                <div className="w-8 h-8 flex items-center justify-center border border-border bg-card/50 group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
                  <ChevronRight size={16} className="text-muted group-hover:text-white" />
                </div>
              </div>
            </div>
          ))}
          
          {builds.length === 0 && (
            <div className="p-32 flex flex-col items-center justify-center text-center opacity-40">
              <Box size={32} className="text-muted mb-4" />
              <div className="text-muted uppercase text-xs font-black tracking-[0.4em] animate-pulse">
                Zero_Objects_Detected_In_Registry
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="flex justify-between items-center px-2 opacity-30 mt-auto">
        <p className="text-[9px] text-muted font-bold uppercase tracking-widest underline">Auth_Node: Secure</p>
        <p className="text-[9px] text-muted font-mono">Registry_Sync: Last_Check_Now</p>
      </footer>
    </div>
  );
}