// _components/LogTerminal.tsx
import React, { useEffect, useRef } from "react";

export function LogTerminal({ logs, status }: { logs: string[], status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = status === 'running';

  useEffect(() => {
    // Only auto-scroll to the bottom if the test is currently running
    if (isRunning && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isRunning]);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#050505] overflow-hidden shadow-inner">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-700'}`} />
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                {isRunning ? 'Streaming...' : 'Execution log'}
            </span>
        </div>
        <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">
            {logs.length} lines
        </span>
      </div>

      {/* Terminal Body */}
      <div 
        ref={scrollRef} 
        className="p-5 font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed scroll-smooth custom-scrollbar select-text"
      >
        {logs.length === 0 && isRunning && (
          <div className="text-zinc-700 italic">Initializing worker... waiting for output</div>
        )}

        {logs.map((log, i) => {
          // Simple highlighting for common terms
          const isError = /error|failed|exception|🔴|❌/i.test(log);
          const isSuccess = /success|passed|✅/i.test(log);

          return (
            <div key={i} className="flex gap-4 mb-0.5 group">
              <span className="text-zinc-800 select-none w-5 text-right italic font-light">{i + 1}</span>
              <span className={`whitespace-pre-wrap ${
                isError ? 'text-red-400' : isSuccess ? 'text-green-400' : 'text-zinc-400'
              }`}>
                {log}
              </span>
            </div>
          );
        })}
        
        {/* Blinking cursor for live mode */}
        {isRunning && (
            <div className="flex gap-4 items-center mt-1">
                <span className="text-zinc-800 select-none w-5 text-right italic">{logs.length + 1}</span>
                <div className="w-1.5 h-4 bg-indigo-500 animate-pulse" />
            </div>
        )}
      </div>
    </div>
  );
}