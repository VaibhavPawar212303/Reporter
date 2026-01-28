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
        // 1. Get Project Details
        const proj = await getProjectById(Number(projectId));
        
        // Check if proj is valid and not an error object
        if (proj && !('error' in proj)) {
          setProject(proj);

          // 2. Fetch builds matching the specific Project ID and its defined Type
          const bld = await getBuildsByProjectAndType(Number(projectId), proj.type);

          // --- FIX START: Type narrowing check ---
          if (Array.isArray(bld)) {
            setBuilds(bld);
          } else {
            console.error("Fetch builds error:", bld.error);
            setBuilds([]); // Fallback to empty array if error occurs
          }
          // --- FIX END ---
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
    <div className="h-screen flex items-center justify-center bg-[#0c0c0e]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] animate-pulse">Establishing_Handshake...</span>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 font-mono bg-[#0c0c0e] min-h-screen">
      {/* 1. AWS STYLE HEADER & BREADCRUMBS */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
          <Server size={12} />
          <span>Infrastructure</span>
          <span className="text-zinc-800">/</span>
          <span>{project?.name?.replace(/ /g, '_') || 'PROJECT_ROOT'}</span>
          <span className="text-zinc-800">/</span>
          <span className="text-zinc-300">Automation_Registry</span>
        </div>

        <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
            <div>
                <h1 className="text-4xl font-bold text-white uppercase tracking-tighter italic">Instance History</h1>
                <p className="text-[10px] text-zinc-500 mt-2 font-bold tracking-widest uppercase">
                  TYPE: <span className="text-indigo-400">{project?.type}</span> • UUID: {projectId}
                </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-600 uppercase border border-zinc-800 px-3 py-1 bg-zinc-900/30">
                Pipeline: <span className="text-emerald-500 ml-1">STABLE_CHANNEL</span>
            </div>
        </div>
      </header>

      {/* 2. AUTOMATION BUILD LIST (Registry UI) */}
      <div className="bg-[#111114] border border-zinc-800 shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Activity size={14} className="text-indigo-500" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">
                Aggregated Execution Log
             </span>
          </div>
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest border border-zinc-800 px-2 py-0.5">
            Objects: {builds.length}
          </span>
        </div>

        <div className="divide-y divide-zinc-800/50">
          {builds.map((b) => (
            <div 
              key={`build-${b.id}`} 
              onClick={() => router.push(`/${project.type.toLowerCase()}?projectId=${projectId}&buildId=${b.id}`)}
              className="group flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-1 h-10 transition-all duration-500",
                  b.status === 'passed' ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : 
                  b.status === 'failed' ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]" : "bg-amber-500"
                )} />

                <div>
                  <h3 className="text-sm font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors uppercase tabular-nums tracking-tight">
                    Build_Reference_{b.id}
                  </h3>
                  <div className="flex items-center gap-4 mt-1.5 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Calendar size={10} className="text-zinc-700"/> {new Date(b.createdAt).toLocaleDateString()}</span>
                    <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                    <span className="flex items-center gap-1.5"><Clock size={10} className="text-zinc-700"/> {b.environment}</span>
                    <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                    <span className="text-zinc-500">{b.type} instance</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="hidden md:block text-right">
                    <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Architecture</p>
                    <div className="flex items-center gap-1 text-zinc-400 font-bold text-[10px] uppercase tracking-tighter">
                       <Shield size={10} className="text-zinc-600" /> x86_64 Stable
                    </div>
                </div>
                <StatusBadge status={b.status} />
                <div className="w-8 h-8 flex items-center justify-center border border-zinc-800 bg-zinc-900/50 group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
                  <ChevronRight size={16} className="text-zinc-700 group-hover:text-white" />
                </div>
              </div>
            </div>
          ))}
          
          {builds.length === 0 && (
            <div className="p-32 flex flex-col items-center justify-center text-center opacity-40">
              <Box size={32} className="text-zinc-800 mb-4" />
              <div className="text-zinc-600 uppercase text-xs font-black tracking-[0.4em] animate-pulse">
                Zero_Objects_Detected_In_Registry
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="flex justify-between items-center px-2 opacity-30">
        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest underline">Auth_Node: Secure</p>
        <p className="text-[9px] text-zinc-500 font-mono">Registry_Sync: Last_Check_Now</p>
      </footer>
    </div>
  );
}