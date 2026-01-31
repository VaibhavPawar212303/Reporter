'use client';
import React, { useEffect } from "react"; // Added useEffect
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const cleanAnsi = (t: any) => typeof t === 'string' ? t.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim() : t;

const getStatusType = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (['passed', 'success', 'expected'].includes(s)) return 'passed';
  if (['failed', 'error', 'fail'].includes(s)) return 'failed';
  return 'running';
};

export function TestResultCard({ test, isExpanded, onToggle }: any) {
  const statusType = getStatusType(test.status);
  const isPassed = statusType === 'passed';
  const isFailed = statusType === 'failed';

  // 🟢 DATA LOGGING: Verify if steps exist in this specific card
  useEffect(() => {
    if (test) {
      console.group(`📝 [CARD_TELEMETRY] ${test.title}`);
      console.log("Status:", test.status);
      console.log("Steps_Found:", test.steps?.length || 0);
      console.log("Payload:", test);
      console.groupEnd();
    }
  }, [test]);

  return (
    <div className={cn(
      "border bg-[#000000] rounded-none mb-0.5 transition-all font-mono",
      isPassed ? "border-zinc-900 hover:border-emerald-900/50" : 
      isFailed ? "border-zinc-900 hover:border-rose-900/50" : "border-zinc-900",
      isExpanded && (isPassed ? "border-emerald-800 shadow-2xl" : "border-rose-800 shadow-2xl")
    )}>

      {/* --- Main Test Header --- */}
      <div onClick={onToggle} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 select-none">
        <div className="flex items-center gap-4">
          <div className={cn(isPassed ? "text-emerald-500" : isFailed ? "text-rose-500" : "text-zinc-500")}>
            {isPassed ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <XCircle size={18} strokeWidth={2.5} />}
          </div>
          <div className="flex flex-col">
            <h3 className="text-[13px] font-bold text-zinc-200 uppercase tracking-tight truncate max-w-2xl">
                {cleanAnsi(test.title)}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Protocol: Execution_Registry</span>
               <span className="w-1 h-1 bg-zinc-800 rounded-full" />
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Ref: #RUN-{test.run_number}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[11px] text-zinc-500 tabular-nums flex items-center gap-1.5 font-bold">
            <Clock size={12} className="opacity-40"/> {test.duration}
          </span>
          <div className={cn(
            "w-6 h-6 flex items-center justify-center border transition-all",
            isExpanded ? "bg-white text-black border-white" : "border-zinc-800 text-zinc-600"
          )}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-900 animate-in fade-in duration-200">
          
          {/* --- SCROLLABLE LOG VIEW --- */}
          <div className={cn(
            "max-h-[600px] overflow-y-auto bg-black relative custom-scrollbar",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-black",
            "[&::-webkit-scrollbar-thumb]:bg-zinc-800"
          )}>
            <div className="flex flex-col">
              
              <div className="absolute left-[70px] top-0 bottom-0 w-px bg-zinc-900 z-0" />

              {test.steps?.map((step: any, i: number) => {
                const isOdd = i % 2 !== 0;
                const stepStatus = getStatusType(step.status);
                const isTestCaseStart = step.arguments?.toLowerCase().includes("running test case:");

                return (
                  <div key={i} className={cn(
                    "flex items-start group relative py-2 transition-colors border-l-4",
                    isTestCaseStart 
                        ? "bg-emerald-500/5 border-l-emerald-500" 
                        : "border-l-transparent",
                    !isTestCaseStart && isOdd ? "bg-white/[0.01]" : "bg-transparent",
                    "hover:bg-zinc-900/40"
                  )}>
                    
                    <div className="w-[58px] shrink-0 text-right pr-4 text-[11px] text-zinc-700 tabular-nums select-none font-bold mt-0.5">
                      {(i + 1).toString().padStart(2, '0')}
                    </div>

                    <div className="relative w-6 shrink-0 flex justify-center z-10 h-full mt-1.5">
                      <div className={cn(
                        "w-2 h-2 rounded-none rotate-45 border border-black z-20 transition-all",
                        stepStatus === 'failed' ? "bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]" : 
                        isTestCaseStart ? "bg-emerald-400 scale-125 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                        "bg-zinc-800 group-hover:bg-zinc-500"
                      )} />
                    </div>

                    <div className="flex-1 flex flex-col gap-1 px-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[11px] font-black uppercase tracking-tighter shrink-0",
                            stepStatus === 'failed' ? "text-rose-500" : isTestCaseStart ? "text-emerald-500" : "text-zinc-600"
                        )}>
                            {isTestCaseStart && <Target size={10} className="inline mr-1 mb-0.5" />}
                            {step.command}
                        </span>
                        <span className="text-[9px] text-zinc-800 font-bold tabular-nums ml-auto px-4 uppercase">
                            {step.duration}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "text-[13px] font-mono leading-relaxed break-all whitespace-pre-wrap",
                        isTestCaseStart ? "text-emerald-400 font-bold" : "text-zinc-400 opacity-90"
                      )}>
                        {step.arguments}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Failure Log Box */}
          {isFailed && (
            <div className="p-6 bg-[#050000] border-t border-rose-900/20">
               <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                 Exception_Trace_Dump
               </div>
               <div className="space-y-4">
                  <div className="text-rose-500 font-bold text-[13px] leading-relaxed border-l-2 border-rose-900 pl-4">
                     {cleanAnsi(test.error?.message || test.error)}
                  </div>
                  {test.error?.stack && (
                    <pre className="text-[10px] text-zinc-600 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar bg-zinc-950 p-4 border border-zinc-900">
                        {cleanAnsi(test.error.stack)}
                    </pre>
                  )}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}