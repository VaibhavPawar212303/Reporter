import React from "react";
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Video, ExternalLink, AlertTriangle, Terminal, Target } from "lucide-react";
import { LogTerminal } from "./LogTerminal";
import { RequirementMapping } from "./RequirementMapping";
import { cn } from "@/lib/utils";

export function TestRow({ test, isExpanded, onToggle, masterMap }: any) {
  const codes = test.case_codes || (test.case_code ? [test.case_code] : []);
  const mappedRequirements = codes.map((c: string) => masterMap?.[c]).filter(Boolean);

  return (
    <div className={cn("transition-all", isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.01]")}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-8 py-6 text-left group">
        <div className="flex items-center gap-6">
          {test.status === 'running' ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : test.status === 'passed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500/80" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500/80" />
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-black bg-white/10 text-zinc-500 px-1.5 py-0.5 rounded tracking-widest uppercase">
                {test.attempts?.length > 1 ? `Attempts: ${test.attempts.length}` : `Run 1`}
              </span>
              
              {test.isFlaky && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 uppercase tracking-widest">
                  <AlertTriangle className="w-2 h-2" /> Flaky
                </span>
              )}

              {codes.map((c: string) => (
                <span key={c} className="text-[9px] font-black text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 uppercase tracking-tighter">{c}</span>
              ))}
              <span className="text-[9px] font-mono text-zinc-600 truncate max-w-[200px] uppercase ml-1 opacity-50">
                {test.specFile?.split(/[\\/]/).pop()}
              </span>
            </div>
            <span className={cn("text-[15px] font-bold tracking-tight", test.status === 'running' ? "text-indigo-400 animate-pulse" : "text-zinc-200 group-hover:text-white")}>
              {test.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">{test.duration || '--'}</span>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-700" /> : <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-8 pb-10 pt-2 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Logs of the Latest attempt */}
          <div className="ml-12 space-y-3">
             <div className="flex items-center gap-2 text-zinc-500"><Terminal className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">Execution Logs</span></div>
             <LogTerminal logs={test.logs || []} status={test.status} />
          </div>

          {/* Master Mapping */}
          <div className="ml-12">
            <RequirementMapping masterData={mappedRequirements} />
          </div>

          {/* Video */}
          {test.video_url && (
            <div className="ml-12 space-y-4">
               <div className="flex items-center justify-between max-w-4xl px-1">
                    <div className="flex items-center gap-2 text-zinc-500"><Video className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Execution Evidence</span></div>
                </div>
                <video key={test.video_url} controls preload="none" className="w-full max-w-4xl rounded-3xl border border-white/10 bg-black shadow-2xl aspect-video">
                  <source src={test.video_url} type="video/webm" />
                </video>
            </div>
          )}
        </div>
      )}
    </div>
  );
}