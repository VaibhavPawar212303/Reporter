// src/app/(route)/playwright/dashboard/_components/LogTerminal.tsx
'use client';

import React, { useState, useMemo } from "react";
import { Terminal, Download, Search, Filter, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogTerminalProps {
  test: any;
}

export function LogTerminal({ test }: LogTerminalProps) {
  const [filter, setFilter] = useState('');
  const [showStdout, setShowStdout] = useState(true);
  const [showStderr, setShowStderr] = useState(true);
  const [copied, setCopied] = useState(false);

  const allLogs = useMemo(() => {
    const logs: any[] = [];
    
    // Add stdout logs with order preservation
    if (test.stdout_logs?.length) {
      test.stdout_logs.forEach((log: string, idx: number) => {
        logs.push({
          type: 'stdout',
          message: log,
          index: idx,
          timestamp: null
        });
      });
    }
    
    // Add stderr logs
    if (test.stderr_logs?.length) {
      test.stderr_logs.forEach((log: string, idx: number) => {
        logs.push({
          type: 'stderr',
          message: log,
          index: test.stdout_logs?.length + idx || idx,
          timestamp: null
        });
      });
    }

    return logs;
  }, [test]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      if (!showStdout && log.type === 'stdout') return false;
      if (!showStderr && log.type === 'stderr') return false;
      if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [allLogs, filter, showStdout, showStderr]);

  const copyToClipboard = () => {
    const text = allLogs.map(log => `[${log.type.toUpperCase()}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadLogs = () => {
    const text = allLogs.map(log => `[${log.type.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test.title.replace(/\s+/g, '_')}_logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Removed auto-scroll to prevent page jumping when expanding tests
  // Users can manually scroll within the log terminal

  if (!allLogs.length) {
    return (
      <div className="ml-12 space-y-3">
        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">
          <Terminal className="w-4 h-4" /> Console Output
        </div>
        <div className="bg-black/40 border border-white/10 rounded-3xl p-8 text-center">
          <Terminal className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-600 text-xs">No logs available for this test</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-12 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">
          <Terminal className="w-4 h-4" /> Console Output
          <span className="text-zinc-700">({filteredLogs.length} lines)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-zinc-400 transition-all flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={downloadLogs}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-zinc-400 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Terminal Header */}
        <div className="bg-[#1e1e1e] px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-[9px] font-mono text-zinc-600 ml-2 uppercase tracking-widest">
              {test.title.substring(0, 50)}{test.title.length > 50 ? '...' : ''}
            </span>
          </div>
          
          {/* Filter Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStdout(!showStdout)}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all",
                showStdout 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                  : "bg-white/5 text-zinc-600 border border-white/5"
              )}
            >
              STDOUT
            </button>
            <button
              onClick={() => setShowStderr(!showStderr)}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all",
                showStderr 
                  ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                  : "bg-white/5 text-zinc-600 border border-white/5"
              )}
            >
              STDERR
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#1a1a1a] px-4 py-2 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-9 pr-4 py-1.5 bg-black/40 border border-white/5 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Log Content */}
        <div className="max-h-[500px] overflow-y-auto font-mono text-xs bg-black/20 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          <div className="p-4 space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">
                No logs match your filter
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <div
                  key={`${log.type}-${log.index}`}
                  className={cn(
                    "py-1 px-3 rounded-lg hover:bg-white/[0.02] transition-colors group",
                    log.type === 'stderr' && "bg-red-500/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "text-[9px] font-bold tabular-nums shrink-0 mt-0.5",
                      log.type === 'stdout' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {log.type === 'stdout' ? `[${log.index + 1}]` : '[ERR]'}
                    </span>
                    <span className={cn(
                      "break-all leading-relaxed",
                      log.type === 'stdout' ? "text-emerald-400/90" : "text-red-400/90"
                    )}>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="bg-[#1e1e1e] px-4 py-2 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-600">
            <span>Total: {allLogs.length} lines</span>
            <span>•</span>
            <span className="text-emerald-600">STDOUT: {test.stdout_logs?.length || 0}</span>
            <span>•</span>
            <span className="text-red-600">STDERR: {test.stderr_logs?.length || 0}</span>
          </div>
          <div className="text-[9px] font-mono text-zinc-700">
            RUNTIME: {test.duration_seconds}s
          </div>
        </div>
      </div>
    </div>
  );
}