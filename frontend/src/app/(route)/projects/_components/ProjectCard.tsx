import { Command, ChevronRight, Monitor, Plus, Loader2, Database, X, Shield } from "lucide-react";
import { getProjects, createProject } from "@/lib/actions"; 
import { cn } from "@/lib/utils";
import Link from "next/link";

export function ProjectCard({ project }: { project: any }) {
    const accentColors: any = {
      indigo: 'border-t-indigo-500',
      amber: 'border-t-amber-500',
      emerald: 'border-t-emerald-500',
      zinc: 'border-t-zinc-700'
    };
  
    return (
      <Link 
        href={`/projects/${project.id}`}
        className={cn(
          "group relative bg-[#111114] border border-zinc-800 border-t-2 p-6 flex flex-col justify-between min-h-[230px] transition-all hover:bg-zinc-900 shadow-sm rounded-none",
          accentColors[project.color] || 'border-t-zinc-700'
        )}
      >
        <div>
          <div className="flex justify-between items-start mb-6">
            <div className="p-2 bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
              <Monitor size={16} className="text-zinc-500 group-hover:text-white" />
            </div>
            <div className="text-right">
               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Coverage</p>
               <p className="text-xl font-bold text-white tabular-nums">{project.coverage || '0%'}</p>
            </div>
          </div>
  
          <h3 className="text-sm font-black text-zinc-200 uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
            {project.name}
          </h3>
          
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{project.type}</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Node_Stable</span>
          </div>
        </div>
  
        <div className="mt-8 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
          <div className="flex flex-col">
             <span className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">History_Objects</span>
             <span className="text-xs font-bold text-zinc-400 tabular-nums">{project.executionCount || 0}</span>
          </div>
          <div className="w-8 h-8 flex items-center justify-center border border-zinc-800 bg-zinc-900/50 group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
            <ChevronRight size={14} className="text-zinc-600 group-hover:text-white" />
          </div>
        </div>
      </Link>
    );
  }