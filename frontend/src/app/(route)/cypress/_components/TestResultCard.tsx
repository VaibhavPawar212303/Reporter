'use client';
import React from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const cleanAnsi = (t: any) => typeof t === 'string' ? t.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim() : t;

// Helper to normalize various status strings from different test runners
const getStatusType = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (['passed', 'success', 'expected'].includes(s)) return 'passed';
  if (['failed', 'error', 'fail'].includes(s)) return 'failed';
  if (s === 'running') return 'running';
  return 'skipped';
};

export function TestResultCard({ test, isExpanded, onToggle }: any) {
  // Normalize the main test status
  const statusType = getStatusType(test.status);
  const isPassed = statusType === 'passed';
  const isFailed = statusType === 'failed';

  const branchStyles = [
    { line: 'border-amber-500', bg: 'bg-amber-500', text: 'text-amber-500' },
    { line: 'border-sky-500', bg: 'bg-sky-500', text: 'text-sky-500' },
    { line: 'border-pink-500', bg: 'bg-pink-500', text: 'text-pink-500' },
    { line: 'border-indigo-500', bg: 'bg-indigo-500', text: 'text-indigo-500' },
  ];

  return (
    <div className={cn(
      "border bg-[#09090b] rounded-none mb-0.5 transition-all font-mono",
      // UI feedback based on normalized status
      isPassed ? "border-zinc-800 hover:border-emerald-500/30" : 
      isFailed ? "border-zinc-800 hover:border-rose-500/30" : "border-zinc-800",
      isExpanded && "border-zinc-700 shadow-xl"
    )}>

      {/* --- Main Test Header --- */}
      <div onClick={onToggle} className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 select-none">
        <div className="flex items-center gap-3">
          <div className={cn(
            isPassed ? "text-emerald-500" : isFailed ? "text-rose-500" : "text-indigo-400"
          )}>
            {isPassed ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <XCircle size={16} strokeWidth={2.5} />}
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-[12px] font-bold text-zinc-200 uppercase tracking-tight">{cleanAnsi(test.title)}</h3>
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-black opacity-50">#{test.run_number}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[12px] text-zinc-500 tabular-nums flex items-center gap-1"><Clock size={10}/> {test.duration}</span>
          {isExpanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-600" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800/50 animate-in fade-in duration-200">
          
          {/* --- SCROLLABLE LOG VIEW --- */}
          <div className={cn(
            "max-h-[400px] overflow-y-auto bg-[#0c0c0e] relative custom-scrollbar",
            "[&::-webkit-scrollbar]:w-2",
            "[&::-webkit-scrollbar-track]:bg-[#0c0c0e]",
            "[&::-webkit-scrollbar-thumb]:bg-zinc-800"
          )}>
            <div className="flex flex-col">
              
              {/* Central Git Rail */}
              <div className="absolute left-[64px] top-0 bottom-0 w-[1px] bg-zinc-800 z-0" />

              {test.steps?.map((step: any, i: number) => {
                const style = branchStyles[i % branchStyles.length];
                const isOdd = i % 2 !== 0;
                const stepStatus = getStatusType(step.status);

                return (
                  <div key={i} className={cn(
                    "flex items-center group relative min-h-[32px] transition-colors border-l-2 border-l-transparent",
                    isOdd ? "bg-white/[0.02]" : "bg-transparent", 
                    "hover:bg-blue-500/5 hover:border-l-blue-500"
                  )}>
                    
                    {/* 1. Index Gutter */}
                    <div className="w-[44px] shrink-0 text-right pr-3 text-[12px] text-zinc-700 tabular-nums select-none font-bold ml-2">
                      {(i + 1).toString().padStart(2, '0')}
                    </div>

                    {/* 2. Git Graph Column */}
                    <div className="relative w-10 shrink-0 flex justify-center z-10 h-full mt-5">
                      {isOdd && (
                        <div className={cn(
                          "absolute left-[50%] top-[-16px] bottom-[50%] w-4 border-l-[1.5px] border-b-[1.5px] rounded-bl-lg -translate-x-[0.5px] opacity-30",
                          style.line
                        )} />
                      )}
                      <div className={cn(
                        "w-2 h-2 rounded-full border border-[#0c0c0e] z-20",
                        stepStatus === 'failed' ? "bg-rose-600 ring-2 ring-rose-900" : style.bg
                      )} />
                    </div>

                    {/* 3. Concise One-Line Content */}
                    <div className="flex-1 flex items-center gap-3 px-2 min-w-0 overflow-hidden">
                      <span className={cn(
                        "text-[12px] font-black uppercase tracking-tighter shrink-0",
                        stepStatus === 'failed' ? "text-rose-500" : style.text
                      )}>
                        {step.command}
                      </span>
                      
                      <span className="text-[11px] text-zinc-500 truncate font-mono opacity-80 group-hover:opacity-100 transition-opacity">
                        {step.arguments}
                      </span>
                    </div>

                    {/* 4. Metadata / Duration */}
                    <div className="shrink-0 flex items-center gap-3 px-4">
                        <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest hidden sm:block">worker_node</span>
                        <span className="text-[9px] text-zinc-600 tabular-nums font-bold">{step.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Failure Log Box */}
          {isFailed && (
            <div className="p-4 bg-rose-950/20 border-t border-rose-900/30">
               <div className="flex items-center gap-2 text-rose-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2">
                 <XCircle size={10} /> Stacktrace_Output
               </div>
               <pre className="text-rose-400/80 font-mono text-[10px] whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                 {cleanAnsi(test.error?.message || test.error)}
               </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}