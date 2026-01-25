"use client";
import React, { useMemo } from 'react';
import { Folder, Layers, Box, ChevronRight, Activity, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function HierarchyExplorer({ tasks }: { tasks: any[] }) {
  // --- ENGINE: RECONSTRUCT HIERARCHY ---
  const hierarchy = useMemo(() => {
    const tree: any = {};

    tasks.forEach(t => {
      const spaceName = t.space?.name || "GLOBAL_RESOURCES";
      const folderName = t.folder?.name || "ROOT_PROJECTS";
      const listName = t.list?.name || "UNGROUPED_NODES";

      if (!tree[spaceName]) tree[spaceName] = {};
      if (!tree[spaceName][folderName]) tree[spaceName][folderName] = {};
      
      if (!tree[spaceName][folderName][listName]) {
        tree[spaceName][folderName][listName] = {
          total: 0,
          resolved: 0,
          bugs: 0,
          id: t.list.id
        };
      }

      const leaf = tree[spaceName][folderName][listName];
      leaf.total++;
      if (t.status?.type === 'closed') leaf.resolved++;
      if ((t.name + (t.status?.status || "")).toLowerCase().match(/bug|hotfix/)) {
        leaf.bugs++;
      }
    });

    return tree;
  }, [tasks]);

  return (
    <div className="space-y-12 animate-in fade-in zoom-in-95 duration-500 text-left">
      {Object.entries(hierarchy).map(([space, folders]: [string, any]) => (
        <div key={space} className="space-y-6">
          {/* SPACE LEVEL */}
          <div className="flex items-center gap-3 bg-zinc-900/20 border border-zinc-800 p-4 rounded-sm">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-sm">
              <Box size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">{space}</h2>
              <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">Space_Node_Active</p>
            </div>
          </div>

          <div className="ml-6 space-y-8">
            {Object.entries(folders).map(([folder, lists]: [string, any]) => (
              <div key={folder} className="space-y-4">
                {/* FOLDER / PROJECT LEVEL */}
                <div className="flex items-center gap-2 text-zinc-400">
                  <Folder size={14} className="text-zinc-500" />
                  <span className="text-[11px] font-black uppercase tracking-widest">{folder}</span>
                  <div className="h-px flex-1 bg-zinc-900" />
                </div>

                {/* SPRINTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(lists)
                    // Sort sprints numerically (Sprint 1, Sprint 2...)
                    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
                    .map(([listName, stats]: [string, any]) => {
                      const progress = Math.round((stats.resolved / stats.total) * 100);
                      const isComplete = progress === 100 && stats.total > 0;

                      return (
                        <div key={listName} className={cn(
                          "bg-[#09090b] border p-4 rounded-sm transition-all group",
                          isComplete ? "border-emerald-900/30" : "border-zinc-800 hover:border-zinc-700"
                        )}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <Layers size={12} className={isComplete ? "text-emerald-500" : "text-zinc-600"} />
                              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">
                                {listName}
                              </span>
                            </div>
                            {isComplete ? (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            ) : (
                              <span className="text-[9px] font-mono text-zinc-600">ID: {stats.id}</span>
                            )}
                          </div>

                          <div className="flex justify-between items-end mb-2">
                            <div className="flex flex-col">
                              <span className="text-lg font-black text-white tabular-nums">{stats.total}</span>
                              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Total_Units</span>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "text-[10px] font-black tabular-nums",
                                isComplete ? "text-emerald-500" : "text-indigo-400"
                              )}>{progress}%</span>
                            </div>
                          </div>

                          {/* SPRINT PROGRESS BAR */}
                          <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000",
                                isComplete ? "bg-emerald-500" : "bg-indigo-500"
                              )} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>

                          <div className="mt-3 flex justify-between items-center border-t border-zinc-900 pt-3">
                            <div className="flex items-center gap-1.5">
                              <Activity size={10} className="text-rose-500" />
                              <span className="text-[8px] font-black text-zinc-500 uppercase">
                                {stats.bugs} Defects
                              </span>
                            </div>
                            <button 
                              className="text-[8px] font-black text-zinc-700 uppercase hover:text-white transition-colors flex items-center gap-1"
                              onClick={() => window.open(`https://app.clickup.com/t/${stats.id}`, '_blank')}
                            >
                              Open <ChevronRight size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}