'use client';
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Terminal, Search, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const cleanAnsi = (text: string) => 
  text?.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

/**
 * Helper: Normalize logs to string array from multiple sources
 */
const normalizeLogs = (logs: any): string[] => {
  if (!logs) return [];
  if (typeof logs === 'string') return logs.trim() ? [logs] : [];
  if (Array.isArray(logs)) return logs.filter(l => l).map(l => String(l || ''));
  if (typeof logs === 'object' && logs.logs) return normalizeLogs(logs.logs);
  return [];
};

export function LogTerminal({ test }: { test: any }) {
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Extract logs from all possible sources
  const normalizedLogs = useMemo(() => {
    const logsArray = 
      normalizeLogs(test?.logs) || 
      normalizeLogs(test?.stdout_logs) || 
      normalizeLogs(test?.test_entry?.stdout_logs) ||
      normalizeLogs(test?.stderr_logs) ||
      [];
    
    console.log('📊 Detected logs:', logsArray.length, 'lines'); // Debug
    
    return logsArray.map((m: string, i: number) => {
      const cleaned = cleanAnsi(m);
      return {
        message: cleaned, 
        index: i, 
        isError: cleaned.includes('🔴') || 
                 cleaned.toLowerCase().includes('error') || 
                 cleaned.toLowerCase().includes('fail') ||
                 cleaned.toLowerCase().includes('assert') ||
                 cleaned.toLowerCase().includes('timeout')
      };
    });
  }, [test?.logs, test?.stdout_logs, test?.test_entry?.stdout_logs, test?.stderr_logs]);

  const filteredLogs = useMemo(() => 
    normalizedLogs.filter((l: any) => 
      !filter || l.message.toLowerCase().includes(filter.toLowerCase())
    ), 
    [normalizedLogs, filter]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && normalizedLogs.length > 0) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [normalizedLogs.length]);

  const copyLogs = () => {
    const logText = normalizedLogs.map(l => l.message).join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state for running tests
  if (!normalizedLogs.length && test?.status === 'running') {
    return (
      <div className="ml-12 p-12 bg-black/40 border border-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        <div className="text-center">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Streaming Live Logs</p>
          <p className="text-[9px] text-zinc-600 mt-1 font-mono">Test in progress...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!normalizedLogs.length) {
    return (
      <div className="ml-12 p-8 bg-black/30 border border-white/5 rounded-[2rem] flex items-center gap-4">
        <AlertCircle className="w-5 h-5 text-zinc-600" />
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase">No console output</p>
          <p className="text-[9px] text-zinc-700">Test completed without logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-12 space-y-3">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          <Terminal className="w-3.5 h-3.5" /> 
          Console Output 
          <span className="text-zinc-800 ml-1 font-mono">({filteredLogs.length}/{normalizedLogs.length})</span>
        </div>
        <button 
          onClick={copyLogs} 
          className="text-[9px] font-black text-zinc-600 hover:text-indigo-400 transition-colors uppercase tracking-tighter flex items-center gap-1.5"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="bg-black/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        {/* Terminal Header */}
        <div className="bg-[#1a1a1c] px-4 py-2 border-b border-white/5 flex items-center gap-4">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-700" />
            <input 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              placeholder="Filter logs..." 
              className="bg-transparent text-[11px] text-zinc-400 outline-none w-full font-mono pl-5 placeholder:text-zinc-800" 
            />
          </div>
        </div>

        {/* Terminal Output */}
        <div 
          ref={scrollRef}
          className="max-h-[450px] overflow-y-auto p-5 font-mono text-[12px] bg-[#0c0c0e]/90 custom-scrollbar space-y-1.5"
        >
          {filteredLogs.map((l: any) => (
            <div key={l.index} className={cn("flex gap-4 group transition-colors", l.isError ? "text-rose-400/90" : "text-zinc-500 hover:text-zinc-300")}>
              <span className="shrink-0 opacity-20 group-hover:opacity-100 select-none text-[10px] tabular-nums text-zinc-400">
                {String(l.index + 1).padStart(3, '0')}
              </span>
              <span className="break-all whitespace-pre-wrap leading-relaxed">{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}