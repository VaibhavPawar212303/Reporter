"use client";
import React, { useMemo } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink, Flame } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function BugAudit({ tasks }: { tasks: any[] }) {
  const sprintStats = useMemo(() => {
    const stats: any[] = [];
    for (let i = 1; i <= 27; i++) {
      // Find all tasks belonging to Sprint i
      const sprintTasks = tasks.filter(t => {
        const nameMatch = t.list.name.match(/\d+/);
        return nameMatch && parseInt(nameMatch[0]) === i;
      });

      // Filter for bugs/hotfixes using IDs from environment
      const defects = sprintTasks.filter(t => 
        t.custom_item_id === process.env.NEXT_PUBLIC_BUG_TYPE_ID || 
        t.custom_item_id === process.env.NEXT_PUBLIC_HOTFIX_TYPE_ID ||
        t.name.toLowerCase().includes('bug')
      );

      const resolved = defects.filter(t => t.status.type === 'closed').length;

      stats.push({
        id: i,
        total: defects.length,
        resolved: resolved,
        open: defects.length - resolved,
        hotfixes: defects.filter(t => t.custom_item_id === process.env.NEXT_PUBLIC_HOTFIX_TYPE_ID).length,
        tasks: defects
      });
    }
    return stats;
  }, [tasks]);

  const totalOpen = sprintStats.reduce((acc, s) => acc + s.open, 0);

  return (
    <div className="space-y-10">
      {/* SPRINT AUDIT HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active_Defects</p>
          <p className="text-4xl font-black text-rose-500 mt-2">{totalOpen}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Clean_Sprints</p>
          <p className="text-4xl font-black text-emerald-500 mt-2">{sprintStats.filter(s => s.total > 0 && s.open === 0).length}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Workspace_Health</p>
          <p className="text-4xl font-black text-white mt-2">{Math.round(((tasks.length - totalOpen) / (tasks.length || 1)) * 100)}%</p>
        </div>
      </div>

      {/* 1-27 GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-3">
        {sprintStats.map(s => {
          const isComplete = s.total > 0 && s.open === 0;
          const hasBugs = s.open > 0;
          
          return (
            <div key={s.id} className={cn(
              "p-3 border rounded-sm transition-all relative overflow-hidden",
              isComplete ? "bg-emerald-500/5 border-emerald-500/20" : 
              hasBugs ? "bg-rose-500/5 border-rose-500/20" : "bg-zinc-900/20 border-zinc-800 opacity-40"
            )}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-zinc-500 uppercase">S_{s.id.toString().padStart(2, '0')}</span>
                {isComplete && <CheckCircle2 size={10} className="text-emerald-500" />}
                {hasBugs && <Flame size={10} className="text-rose-500 animate-pulse" />}
              </div>
              <div className="text-xl font-black text-white">{s.total}</div>
              <div className="text-[8px] font-bold text-zinc-600 uppercase">Total_Defects</div>
              
              {hasBugs && (
                <div className="mt-2 text-[10px] font-black text-rose-500">
                  {s.open} LEFT
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EXECUTION LIST: ONLY OPEN BUGS */}
      <div className="bg-[#09090b] border border-zinc-800 rounded-sm">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-500" /> Actionable_Execution_List
          </h3>
        </div>
        <div className="divide-y divide-zinc-900">
          {sprintStats.flatMap(s => s.tasks).filter(t => t.status.type !== 'closed').map(bug => (
            <div key={bug.id} className="p-4 flex justify-between items-center hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                <div>
                  <p className="text-[11px] font-bold text-zinc-200 uppercase">{bug.name}</p>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase mt-1">
                    {bug.list.name} • {bug.status.status} • {bug.id}
                  </p>
                </div>
              </div>
              <a href={bug.url} target="_blank" className="text-zinc-700 hover:text-white transition-colors">
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}