"use client";
import React, { useMemo } from 'react';
import { Activity, Zap, ExternalLink, CheckCircle2, ShieldAlert, Layers, ShieldCheck } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function LWSprintAudit({ tasks = [] }: { tasks: any[] }) {
  const lwMatrix = useMemo(() => {
    // 1. Create a hardcoded array from 1 to 27
    const matrix = Array.from({ length: 27 }, (_, i) => ({
      sprintNumber: i + 1,
      listId: null,
      listName: `LW Sprint ${i + 1}`,
      total: 0,
      resolved: 0,
      bugs: 0,
      hotfixes: 0,
      allTasks: [] as any[]
    }));

    // 2. Map every task from the API into these 27 buckets
    tasks.forEach(t => {
      const name = t.list?.name || "";
      
      // Filter for names containing "LW" or "LIVE"
      if (/LW|LIVE|WEB/i.test(name)) {
        const match = name.match(/\d+/); // Find the sprint number
        const num = match ? parseInt(match[0]) : null;

        if (num && num >= 1 && num <= 27) {
          const slot = matrix[num - 1];
          slot.listId = t.list.id;
          slot.listName = name;
          slot.total++;
          slot.allTasks.push(t);
          
          if (t.status?.type === 'closed') slot.resolved++;
          
          // Bug Detection logic
          const isBug = (t.name + (t.status?.status || "")).toLowerCase().match(/bug|hotfix|issue/);
          if (isBug) slot.bugs++;
          if (t.custom_item_id === process.env.NEXT_PUBLIC_HOTFIX_TYPE_ID) slot.hotfixes++;
        }
      }
    });

    return matrix;
  }, [tasks]);

  const totalBugs = lwMatrix.reduce((acc, s) => acc + s.bugs, 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      
      {/* AUDIT SUMMARY HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Registry_Status</p>
          <p className="text-4xl font-black text-white mt-2">LW_01 <span className="text-zinc-800">—</span> LW_27</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Active_LW_Defects</p>
          <p className="text-4xl font-black text-white mt-2 tabular-nums">{totalBugs}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm relative overflow-hidden">
          <Zap className="absolute -right-4 -top-4 w-20 h-20 text-emerald-500/10" />
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Deployment_Stability</p>
          <p className="text-4xl font-black text-white mt-2">
            {lwMatrix.filter(s => s.total > 0 && s.resolved === s.total).length} 
            <span className="text-sm text-zinc-600 ml-2 uppercase font-bold">Clean Nodes</span>
          </p>
        </div>
      </div>

      {/* THE 27-SLOT GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-9 gap-4">
        {lwMatrix.map((slot) => {
          const hasData = slot.total > 0;
          const isClean = hasData && slot.resolved === slot.total;
          const progress = hasData ? Math.round((slot.resolved / slot.total) * 100) : 0;

          return (
            <div key={slot.sprintNumber} className={cn(
              "p-4 border rounded-sm transition-all relative group h-32 flex flex-col justify-between",
              !hasData ? "border-zinc-900 bg-zinc-950/50 opacity-20" : 
              isClean ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
            )}>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-zinc-500 uppercase font-mono">
                  LW_{slot.sprintNumber.toString().padStart(2, '0')}
                </span>
                {isClean && <CheckCircle2 size={12} className="text-emerald-500" />}
                {hasData && !isClean && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-black tabular-nums", hasData ? "text-white" : "text-zinc-800")}>
                    {slot.total}
                  </span>
                  <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">Tasks</span>
                </div>
                {hasData && (
                  <div className="flex justify-between items-center mt-1">
                    <span className={cn("text-[9px] font-black", slot.bugs > 0 ? "text-rose-500" : "text-zinc-500")}>
                      {slot.bugs} BUGS
                    </span>
                    <span className="text-[9px] font-mono text-zinc-600">{progress}%</span>
                  </div>
                )}
              </div>

              {/* Quick Jump to ClickUp */}
              {slot.listId && (
                <a 
                  href={`https://app.clickup.com/t/${slot.listId}`} 
                  target="_blank" 
                  className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 bg-indigo-600/10 flex items-center justify-center transition-all backdrop-blur-[2px]"
                >
                  <ExternalLink size={16} className="text-white" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* DETAILED EXECUTION LOG: OPEN DEFECTS ONLY */}
      <div className="bg-[#09090b] border border-zinc-800 rounded-sm">
        <div className="p-4 bg-black border-b border-zinc-800 flex items-center gap-3">
          <Layers size={16} className="text-indigo-500" />
          <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Unresolved_LW_Artifacts</h3>
        </div>
        <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-900 custom-scrollbar">
          {lwMatrix.flatMap(s => s.allTasks).filter(t => t.status.type !== 'closed').length > 0 ? (
            lwMatrix.flatMap(s => s.allTasks).filter(t => t.status.type !== 'closed').map(t => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-5">
                  <div className="text-[10px] font-mono text-zinc-700 w-12 shrink-0">#{t.id}</div>
                  <div>
                    <p className="text-[12px] font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors uppercase">{t.name}</p>
                    <p className="text-[9px] text-zinc-600 font-mono mt-1 uppercase">
                      Node: {t.list.name} • Status: {t.status.status}
                    </p>
                  </div>
                </div>
                <a href={t.url} target="_blank" className="p-2 border border-zinc-800 text-zinc-600 hover:text-white transition-all">
                  <ExternalLink size={14} />
                </a>
              </div>
            ))
          ) : (
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <ShieldCheck size={32} className="text-emerald-500/50" />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Global LW Integrity Confirmed: 0 Deficiencies Found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}