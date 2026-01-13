// src/app/(route)/playwright/dashboard/_components/LogTerminal.tsx
import React, { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export function LogTerminal({ logs, status }: { logs: string[], status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = status === 'running';

  useEffect(() => {
    // Only auto-scroll to the bottom if the test is currently running.
    // This allows users to read previous logs of finished tests without jumping.
    if (isRunning && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isRunning]);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-[#050505] shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-zinc-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            {isRunning ? 'Live Worker Output' : 'Execution Log History'}
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-800'}`} />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={scrollRef}
        className="max-h-80 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed scroll-smooth custom-scrollbar select-text"
      >
        {logs.length === 0 && isRunning && (
          <div className="text-zinc-600 italic">Initializing worker... waiting for output</div>
        )}
        
        {logs.map((log, i) => {
          // Detect step markers or errors for coloring
          const isStep = log.includes('⏭️') || log.includes('📝');
          const isError = /error|failed|🔴/i.test(log);

          return (
            <div key={i} className="flex gap-4 mb-1 group">
              <span className="text-zinc-800 select-none w-5 text-right italic font-light">{i + 1}</span>
              <span className={`whitespace-pre-wrap ${
                isError ? 'text-red-400' : isStep ? 'text-indigo-300' : 'text-zinc-400'
              }`}>
                {log}
              </span>
            </div>
          );
        })}

        {/* Blinking cursor for live mode */}
        {isRunning && (
          <div className="flex gap-4 items-center mt-2">
             <span className="text-zinc-800 select-none w-5 text-right italic">{logs.length + 1}</span>
             <div className="w-1.5 h-3.5 bg-indigo-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}