// _components/TestRow.tsx
import React from "react";
import { 
  CheckCircle2, XCircle, Loader2, ChevronDown, 
  ChevronRight, Terminal, Video, ExternalLink 
} from "lucide-react";
import { LogTerminal } from "./LogTerminal";

export function TestRow({ test, isExpanded, onToggle }: any) {
  return (
    <div className={`transition-all ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
      <button 
        onClick={onToggle} 
        className="w-full flex items-center justify-between px-8 py-6 text-left group"
      >
        <div className="flex items-center gap-5">
          {/* Status Icon */}
          {test.status === 'running' ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : (test.status === 'passed' || test.status === 'expected') ? (
            <CheckCircle2 className="w-5 h-5 text-green-500/80" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500/80" />
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black text-indigo-500/60 bg-indigo-500/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                {test.case_code || 'TC-N/A'}
              </span>
              <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[400px]">
                {test.specFile?.split(/[\\/]/).pop()}
              </span>
            </div>
            <span className={`text-[15px] font-bold tracking-tight ${test.status === 'running' ? 'text-indigo-400 animate-pulse' : 'text-zinc-200'}`}>
              {test.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600">{test.duration || '--'}</span>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-700" /> : <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />}
        </div>
      </button>

      {/* 🔥 EXPANDED VIEW: LOGS & VIDEO */}
      {isExpanded && (
        <div className="px-8 pb-8 pt-2 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* LOGS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-500 px-1">
              <Terminal className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-widest">Worker Console Output</span>
            </div>
            <LogTerminal logs={test.logs || []} status={test.status} />
          </div>

          {/* VIDEO SECTION */}
          {test.video_url && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Video className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Execution Evidence</span>
                </div>
                <a href={test.video_url} target="_blank" className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 uppercase transition-colors">
                  <ExternalLink className="w-3 h-3 inline mr-1" /> Open Source
                </a>
              </div>
              <video controls preload="metadata" className="w-full rounded-2xl border border-white/10 bg-black shadow-2xl aspect-video">
                <source src={test.video_url} type="video/webm" />
              </video>
            </div>
          )}

          {/* ERROR TRACE (if failed) */}
          {test.status === 'failed' && test.error && (
            <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl text-[11px] text-red-400/80 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
              {test.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}