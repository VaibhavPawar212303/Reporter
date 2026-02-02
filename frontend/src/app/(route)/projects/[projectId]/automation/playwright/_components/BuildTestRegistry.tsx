'use client';

import React, { useState, useMemo } from "react";
import {
  Search, ChevronDown, ChevronRight, Clock, FileCode,
  Activity, Terminal, AlertTriangle, Cpu, Globe,
  Layers, Code2, Video, CalendarClock,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function BuildTestRegistry({ buildData }: { buildData: any }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 1. Flatten tests and capture the parent 'executedAt' time
  const allTests = useMemo(() => {
    if (!buildData?.results) return [];
    return buildData.results.flatMap((spec: any) => {
      const tests = Array.isArray(spec.tests) ? spec.tests : [];

      // Extract the specific execution timestamp for this spec group
      const timestamp = spec.executedAt ? new Date(spec.executedAt) : null;
      const formattedTime = timestamp
        ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        : 'N/A';
      const formattedFullDate = timestamp ? timestamp.toLocaleString() : 'N/A';

      return tests.map((test: any, idx: number) => ({
        ...test,
        uid: `${spec.specFile}-${test.title}-${test.run_number || idx}`,
        specFile: spec.specFile?.split('/').pop() || 'Root',
        fullSpecPath: spec.specFile,
        browser: test.browser || buildData.type,
        // NEW: Execution time fields
        startTime: formattedTime,
        fullTimestamp: formattedFullDate
      }));
    });
  }, [buildData]);

  // 2. Filter logic
  const filteredTests = useMemo(() => {
    return allTests.filter((t: any) => {
      const matchesSearch = t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.specFile?.toLowerCase().includes(search.toLowerCase());
      const s = t.status?.toLowerCase();
      if (filter === 'passed') return matchesSearch && ['passed', 'success', 'expected'].includes(s);
      if (filter === 'failed') return matchesSearch && ['failed', 'error', 'fail'].includes(s);
      return matchesSearch;
    });
  }, [allTests, search, filter]);

  return (
    <div className="space-y-4 font-mono selection:bg-white selection:text-black">
      {/* TOOLBAR */}
      <div className="flex bg-[#111114] border border-zinc-900 p-1 gap-1">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="QUERY_TEST_IDENTITY..."
            className="w-full bg-[#09090b] border border-zinc-800 p-2.5 pl-10 text-[11px] text-white outline-none focus:border-zinc-600 uppercase tracking-widest"
          />
        </div>
        <div className="flex bg-[#09090b] border border-zinc-800 px-2 gap-1 items-center">
          {['all', 'passed', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 text-[9px] font-black uppercase tracking-tighter transition-all",
                filter === f ? "bg-white text-black" : "text-zinc-600 hover:text-zinc-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* REGISTRY LIST */}
      <div className="bg-zinc-900 border border-zinc-900 shadow-2xl">
        <div className="px-6 py-3 bg-zinc-950 border-b border-zinc-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Activity size={14} className="text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Build_Execution_Registry</span>
          </div>
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest tabular-nums">
            Nodes_Resolved: {filteredTests.length}
          </span>
        </div>

        <div className="divide-y divide-zinc-900">

          {filteredTests.map(
            //@ts-ignore
            (t) => (
              <div key={t.uid} className="flex flex-col">
                {/* ROW HEADER */}
                <div
                  onClick={() => setExpandedId(expandedId === t.uid ? null : t.uid)}
                  className={cn(
                    "group flex items-center justify-between p-4 cursor-pointer transition-all relative overflow-hidden",
                    expandedId === t.uid ? "bg-[#111114]" : "bg-black hover:bg-zinc-950"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-1 h-8 transition-all",
                      ['passed', 'success', 'expected'].includes(t.status?.toLowerCase())
                        ? "bg-white shadow-[0_0_10px_white]"
                        : "bg-rose-600 shadow-[0_0_10px_#e11d48]"
                    )} />
                    <div>
                      <h3 className="text-[13px] font-bold text-zinc-200 group-hover:text-white transition-colors uppercase tracking-tight">{t.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><FileCode size={10} /> {t.specFile}</span>
                        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                        <span className="flex items-center gap-1"><Clock size={10} /> {t.duration}</span>
                        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                        <span className="text-zinc-500 tabular-nums">{t.startTime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-10">
                    <StatusBadge status={t.status} />
                    <div className={cn(
                      "w-7 h-7 flex items-center justify-center border border-zinc-800 transition-all",
                      expandedId === t.uid ? "bg-white text-black border-white" : "text-zinc-600 group-hover:text-white"
                    )}>
                      {expandedId === t.uid ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {expandedId === t.uid && (
                  <div className="bg-[#09090b] border-t border-zinc-900 p-8 space-y-10 animate-in fade-in duration-300">

                    {/* DETAIL GRID: METADATA & ERROR */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Cpu size={12} /> Execution_Metadata
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <MetaItem label="Browser" value={t.browser} icon={<Globe size={10} />} />
                          <MetaItem label="Run_Number" value={t.run_number || '01'} icon={<Layers size={10} />} />
                          <MetaItem label="Started_At" value={t.fullTimestamp} icon={<CalendarClock size={10} />} className="col-span-2" />
                          <MetaItem label="Spec_Path" value={t.fullSpecPath} icon={<Terminal size={10} />} className="col-span-2" />
                        </div>
                      </div>

                      {t.error && (
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ShieldAlert size={12} /> Exception_Handshake
                          </h4>
                          <div className="bg-rose-950/10 border border-rose-900/30 p-4 font-mono">
                            <p className="text-[11px] text-rose-400 font-bold mb-2">{t.error.message}</p>
                            <pre className="text-[10px] text-rose-500/60 overflow-x-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                              {t.error.stack}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* EXECUTION STEPS (Maintained) */}
                    {t.steps?.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Code2 size={12} className="text-white" /> Command_Pipeline_Flow
                        </h4>
                        <div className="relative pl-12 space-y-0.5">
                          <div className="absolute left-[20px] top-0 bottom-0 w-px bg-zinc-800" />
                          {t.steps.map((step: any, sIdx: number) => (
                            <div key={sIdx} className="group/step flex items-center min-h-[36px] relative hover:bg-white/[0.02]">
                              <div className="absolute left-[-32px] w-2 h-2 rounded-none bg-zinc-950 border border-zinc-700 group-hover/step:border-white transition-all z-10 rotate-45" />
                              <div className="flex-1 flex items-center justify-between pr-4">
                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-bold text-zinc-700 w-6">{String(sIdx + 1).padStart(2, '0')}</span>
                                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-tight">{step.command}</span>
                                  <span className="text-[11px] text-zinc-600 truncate max-w-md italic">{step.arguments}</span>
                                </div>
                                <span className="text-[9px] text-zinc-700 tabular-nums">{step.duration}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* VIDEO ARTIFACT */}
                    {t.video_url && (
                      <div className="pt-4">
                        <a href={t.video_url} target="_blank" className="inline-flex items-center gap-3 px-6 py-2 border border-zinc-800 hover:border-white text-[10px] font-black uppercase tracking-widest transition-all">
                          <Video size={14} /> Replay_Session_Artifact
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, icon, className }: any) {
  return (
    <div className={cn("bg-black border border-zinc-900 p-3", className)}>
      <div className="flex items-center gap-2 text-zinc-600 mb-1">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[11px] text-zinc-200 uppercase font-bold truncate">{value}</p>
    </div>
  );
}