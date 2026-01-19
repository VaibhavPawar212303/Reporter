'use client';
import React from "react";
import { CheckCircle2, XCircle, Clock, Monitor, ChevronDown, ChevronRight, ListTree, AlertTriangle } from "lucide-react";
import { LogTerminal } from "./LogTerminal";
import { cn } from "@/lib/utils";

/* -------------------- UTILS -------------------- */

const cleanAnsi = (t: any) => typeof t === 'string' ? t.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim() : t;

/**
 * Parses stringified Cypress arguments to show only the main value
 * e.g. '["/login"]' -> '/login'
 * e.g. '["//button", {"timeout": 20000}]' -> '//button'
 */
const formatCypressArgs = (argsString: string): string => {
  if (!argsString || argsString === "[]") return "";
  try {
    const parsed = JSON.parse(argsString);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const mainArg = parsed[0];
      // If the first arg is a string (selector/URL), return it. 
      // If it's an object, stringify it simply.
      return typeof mainArg === 'string' ? mainArg : JSON.stringify(mainArg);
    }
    return argsString;
  } catch (e) {
    // If it's not valid JSON, just clean ANSI and return
    return cleanAnsi(argsString);
  }
};

/* -------------------- COMPONENT -------------------- */

export function TestResultCard({ test, isExpanded, onToggle }: any) {
  return (
    <div className={cn("border border-white/5 rounded-3xl transition-all duration-300", isExpanded ? "bg-[#0c0c0e] border-indigo-500/20 shadow-2xl" : "bg-[#09090b] hover:bg-white/[0.01]")}>
      
      {/* ... Header remains the same ... */}
      <div onClick={onToggle} className="px-8 py-5 flex items-center justify-between cursor-pointer">
        <div className="flex items-center gap-5">
          <div className={cn("p-2 rounded-xl border", test.status === 'passed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500")}>
            {test.status === 'passed' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[8px] font-black bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-widest">Run {test.run_number}</span>
            </div>
            <h3 className="text-sm font-bold text-zinc-200">{cleanAnsi(test.title)}</h3>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">{test.duration}</span>
          {isExpanded ? <ChevronDown size={16} className="text-zinc-500" /> : <ChevronRight size={16} className="text-zinc-700" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-8 pb-10 space-y-10 animate-in fade-in slide-in-from-top-1">
          
          {/* Lazy Loaded Logs */}
          {test.logs?.length > 0 && <LogTerminal test={test} />}
          
          {/* Execution Steps */}
          {test.steps?.length > 0 && (
            <div className="ml-12 space-y-4">
              <div className="flex items-center gap-2 text-zinc-600 text-[9px] font-black uppercase tracking-widest px-1">
                <ListTree size={14} className="text-indigo-500/50" /> Command Log ({test.steps.length})
              </div>
              <div className="space-y-2">
                {test.steps.map((s: any, i: number) => (
                  <div key={i} className="group/step flex items-start gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                    <div className={cn(
                      "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 shadow-sm",
                      s.status === 'passed' ? "bg-emerald-500/40" : "bg-rose-500"
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[11px] font-black text-zinc-400 uppercase tracking-tight group-hover/step:text-zinc-200 transition-colors">
                          {s.command}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-700">{s.duration}</span>
                      </div>
                      
                      {/* ✅ PARSED ARGUMENTS: This handles the messy JSON from your screenshot */}
                      <p className="text-[11px] text-zinc-500 font-mono break-all leading-relaxed line-clamp-2 italic">
                        {formatCypressArgs(s.arguments)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {test.status === 'failed' && (
            <div className="ml-12 p-6 bg-rose-500/[0.03] border border-rose-500/10 rounded-[2rem] shadow-inner">
               <div className="flex items-center gap-2 text-rose-500 text-[9px] font-black uppercase tracking-widest mb-4">
                 <AlertTriangle size={14} /> Assertion Failure
               </div>
               <pre className="text-rose-400/90 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
                 {cleanAnsi(test.error?.message || test.error)}
               </pre>
               {test.stack_trace && (
                 <div className="mt-6 pt-6 border-t border-rose-500/10">
                    <pre className="text-zinc-600 font-mono text-[10px] leading-relaxed overflow-x-auto custom-scrollbar max-h-60">
                      {cleanAnsi(test.stack_trace)}
                    </pre>
                 </div>
               )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}