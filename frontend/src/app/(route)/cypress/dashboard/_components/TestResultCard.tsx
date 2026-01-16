'use client';

import React from "react";
import { ChevronDown, ShieldCheck, ShieldAlert, Tag, Clock, AlertCircle, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TestStepLog } from "./TestStepLog";

export function TestResultCard({ test, isExpanded, onToggle }: any) {
  const isPassed = test.status === "passed";

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[2rem] border transition-all duration-500",
      isPassed ? "bg-zinc-900/40 border-emerald-500/10 hover:border-emerald-500/30" : "bg-zinc-900/40 border-rose-500/10 hover:border-rose-500/30",
      isExpanded && (isPassed ? "ring-1 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.05)]" : "ring-1 ring-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.05)]")
    )}>
      <div className="p-6 cursor-pointer flex items-center justify-between" onClick={onToggle}>
        <div className="flex items-center gap-6">
          {/* Status Hexagon */}
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
            isPassed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}>
            {isPassed ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-white uppercase tracking-tight leading-none">
              {test.title}
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono tabular-nums uppercase">{test.duration}</span>
              </div>
              {test.case_codes?.map((code: string) => (
                <div key={code} className="flex items-center gap-1.5 text-zinc-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                  <Tag className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="text-[9px] font-black">{code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ChevronDown className={cn("w-5 h-5 text-zinc-600 transition-transform duration-500", isExpanded && "rotate-180 text-white")} />
      </div>

      {isExpanded && (
        <div className="px-8 pb-10 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Failure Exception Box */}
            {!isPassed && (
                <div className="rounded-2xl bg-rose-500/5 border border-rose-500/10 p-5 font-mono">
                    <div className="flex items-center gap-2 text-rose-400 mb-3">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Exception Trace</span>
                    </div>
                    <p className="text-xs text-rose-200/80 leading-relaxed mb-4">{test.error}</p>
                    {test.stack_trace && (
                        <pre className="text-[9px] text-rose-500/40 bg-black/40 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                            {test.stack_trace}
                        </pre>
                    )}
                </div>
            )}

            {/* Step Flow Timeline */}
            <div className="space-y-6">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] border-l-2 border-zinc-800 pl-4">Test Execution Flow</p>
                <TestStepLog steps={test.steps} />
            </div>

            {/* Screenshots */}
            {test.screenshot_url && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-500 border-l-2 border-zinc-800 pl-4">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Visual Evidence</span>
                    </div>
                    <div className="rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl bg-black">
                        <img src={test.screenshot_url} className="w-full opacity-80 hover:opacity-100 transition-opacity duration-700" alt="Failure Artifact" />
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}