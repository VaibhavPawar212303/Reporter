import { cn } from "@/lib/utils";
import { ChevronRight, Monitor } from "lucide-react";
import Link from "next/link";

export function ProjectCard({ project }: { project: any }) {
  const accentColors: any = {
    indigo: 'border-t-indigo-500',
    amber: 'border-t-amber-500',
    emerald: 'border-t-emerald-500',
    zinc: 'border-t-muted' // Changed from hardcoded zinc-700
  };

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "group relative bg-card border border-border border-t-2 p-6 flex flex-col justify-between min-h-[230px] transition-all hover:bg-muted/5 shadow-sm rounded-none duration-300",
        accentColors[project.color] || 'border-t-muted'
      )}
    >
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="p-2 bg-background border border-border group-hover:border-muted transition-colors">
            <Monitor size={16} className="text-muted group-hover:text-foreground" />
          </div>
          <div className="text-right">
             <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">Coverage</p>
             <p className="text-xl font-bold text-foreground tabular-nums">{project.coverage || '0%'}</p>
          </div>
        </div>

        <h3 className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-indigo-500 transition-colors">
          {project.name}
        </h3>
        
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{project.type}</span>
          <span className="w-1 h-1 bg-border rounded-full" />
          <span className="text-[9px] font-bold text-muted uppercase tracking-widest opacity-70">Node_Stable</span>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
        <div className="flex flex-col">
           <span className="text-[8px] text-muted uppercase font-black tracking-tighter leading-none mb-1">History_Objects</span>
           <span className="text-xs font-bold text-muted tabular-nums">{project.executionCount || 0}</span>
        </div>
        <div className="w-8 h-8 flex items-center justify-center border border-border bg-card/50 group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
          <ChevronRight size={14} className="text-muted group-hover:text-white" />
        </div>
      </div>
    </Link>
  );
}