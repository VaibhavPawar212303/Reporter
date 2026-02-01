'use client';
import React, { useEffect } from "react";
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

  useEffect(() => {
    if (test) {
      console.group(`📝 [CARD_TELEMETRY] ${test.title}`);
      console.log("Status:", test.status);
      console.log("Steps_Found:", test.steps?.length || 0);
      console.groupEnd();
    }
  }, [test]);

  return (
    <div className={cn(
      "border bg-background rounded-none mb-0.5 transition-all font-mono",
      isPassed ? "border-border hover:border-emerald-500/50" : 
      isFailed ? "border-border hover:border-rose-500/50" : "border-border",
      isExpanded && (isPassed ? "border-emerald-500 shadow-xl" : "border-rose-500 shadow-xl")
    )}>

      {/* --- Main Test Header --- */}
      <div onClick={onToggle} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/10 select-none">
        <div className="flex items-center gap-4">
          <div className={cn(isPassed ? "text-emerald-500" : isFailed ? "text-rose-500" : "text-muted")}>
            {isPassed ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <XCircle size={18} strokeWidth={2.5} />}
          </div>
          <div className="flex flex-col">
            <h3 className="text-[13px] font-bold text-foreground uppercase tracking-tight truncate max-w-2xl">
                {cleanAnsi(test.title)}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[8px] font-black text-muted uppercase tracking-widest leading-none">Protocol: Execution_Registry</span>
               <span className="w-1 h-1 bg-border rounded-full" />
               <span className="text-[8px] font-black text-muted uppercase tracking-widest leading-none">Ref: #RUN-{test.run_number}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[11px] text-muted tabular-nums flex items-center gap-1.5 font-bold">
            <Clock size={12} className="opacity-40"/> {test.duration}
          </span>
          <div className={cn(
            "w-6 h-6 flex items-center justify-center border transition-all",
            isExpanded ? "bg-foreground text-background border-foreground" : "border-border text-muted"
          )}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border animate-in fade-in duration-200">
          
          {/* --- SCROLLABLE LOG VIEW --- */}
          <div className={cn(
            "max-h-[600px] overflow-y-auto bg-background relative custom-scrollbar",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-background",
            "[&::-webkit-scrollbar-thumb]:bg-border"
          )}>
            <div className="flex flex-col">
              
              {/* Timeline Thread */}
              <div className="absolute left-[70px] top-0 bottom-0 w-px bg-border z-0" />

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
                    !isTestCaseStart && isOdd ? "bg-muted/5" : "bg-transparent",
                    "hover:bg-muted/10"
                  )}>
                    
                    {/* Line Number */}
                    <div className="w-[58px] shrink-0 text-right pr-4 text-[11px] text-muted/50 tabular-nums select-none font-bold mt-0.5">
                      {(i + 1).toString().padStart(2, '0')}
                    </div>

                    {/* Step Icon Node */}
                    <div className="relative w-6 shrink-0 flex justify-center z-10 h-full mt-1.5">
                      <div className={cn(
                        "w-2 h-2 rounded-none rotate-45 border border-background z-20 transition-all",
                        stepStatus === 'failed' ? "bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]" : 
                        isTestCaseStart ? "bg-emerald-400 scale-125 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                        "bg-muted group-hover:bg-foreground/50"
                      )} />
                    </div>

                    <div className="flex-1 flex flex-col gap-1 px-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[11px] font-black uppercase tracking-tighter shrink-0",
                            stepStatus === 'failed' ? "text-rose-500" : isTestCaseStart ? "text-emerald-500" : "text-muted"
                        )}>
                            {isTestCaseStart && <Target size={10} className="inline mr-1 mb-0.5" />}
                            {step.command}
                        </span>
                        <span className="text-[9px] text-muted/40 font-bold tabular-nums ml-auto px-4 uppercase">
                            {step.duration}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "text-[13px] font-mono leading-relaxed break-all whitespace-pre-wrap",
                        isTestCaseStart ? "text-emerald-600 font-bold dark:text-emerald-400" : "text-foreground/70"
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
            <div className="p-6 bg-rose-500/5 border-t border-rose-500/20">
               <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                 Exception_Trace_Dump
               </div>
               <div className="space-y-4">
                  <div className="text-rose-600 dark:text-rose-500 font-bold text-[13px] leading-relaxed border-l-2 border-rose-500 pl-4">
                     {cleanAnsi(test.error?.message || test.error)}
                  </div>
                  {test.error?.stack && (
                    <pre className="text-[10px] text-muted font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar bg-muted/10 p-4 border border-border">
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