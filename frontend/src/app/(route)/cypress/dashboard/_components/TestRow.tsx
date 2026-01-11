import React from "react";
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Monitor } from "lucide-react";
import { RequirementMapping } from "./RequirementMapping";

export function TestRow({ test, isExpanded, onToggle, masterMap }: any) {
  const codes = test.case_codes || (test.case_code ? [test.case_code] : []);
  const mappedRequirements = codes.map((c: string) => masterMap[c]).filter(Boolean);

  return (
    <div className={`transition-all ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-8 py-6 text-left group">
        <div className="flex items-center gap-6">
          {test.status === 'running' ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : 
           test.status === 'passed' ? <CheckCircle2 className="w-5 h-5 text-green-500/80" /> : <XCircle className="w-5 h-5 text-red-500/80" />}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-[8px] font-black uppercase bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded border border-white/5 tracking-tighter">
                <Monitor className="w-2.5 h-2.5" /> {test.project}
              </span>
              {codes.map((c: string) => (
                <span key={c} className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded leading-none border border-indigo-500/10 uppercase">{c}</span>
              ))}
            </div>
            <span className={`text-[15px] font-bold tracking-tight ${test.status === 'running' ? 'text-indigo-400 animate-pulse' : 'text-zinc-200 group-hover:text-white'}`}>{test.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">{test.duration || '--'}</span>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-700" /> : <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-8 pb-10 pt-2 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
          <RequirementMapping masterData={mappedRequirements} />
          {test.status === 'failed' && test.error && (
            <div className="p-6 bg-red-500/[0.03] border border-red-500/10 rounded-3xl text-red-400/80 font-mono text-[11px] whitespace-pre-wrap leading-relaxed flex gap-3">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {test.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}