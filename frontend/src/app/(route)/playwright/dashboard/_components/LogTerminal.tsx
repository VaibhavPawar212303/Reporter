// _components/LogTerminal.tsx
import React, { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export function LogTerminal({ logs, status }: { logs: string[], status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = status === 'running';

  useEffect(() => {
    if (isRunning && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isRunning]);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#050505] overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-700'}`} />
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{isRunning ? 'Realtime stream' : 'Execution log'}</span>
        </div>
        <span className="text-[8px] font-mono text-zinc-600">{logs.length} lines</span>
      </div>
      <div ref={scrollRef} className="p-5 font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed scroll-smooth custom-scrollbar select-text">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 mb-0.5 group">
            <span className="text-zinc-800 select-none w-5 text-right italic font-light">{i + 1}</span>
            <span className={/error|failed|exception/i.test(log) ? 'text-red-400' : /✅|passed|success/i.test(log) ? 'text-green-400' : 'text-zinc-400'}>{log}</span>
          </div>
        ))}
        {isRunning && <div className="ml-8 w-1.5 h-3.5 bg-indigo-500 animate-pulse mt-1" />}
      </div>
    </div>
  );
}