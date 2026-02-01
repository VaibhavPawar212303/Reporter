'use client';

import React from "react";
import { Terminal, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const formatLogLine = (line: string): string => {
  if (!line) return '';
  return line.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
};

interface LogTerminalProps {
  test: any;
}

export function LogTerminal({ test }: LogTerminalProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const extractLogs = React.useMemo((): { stdout: string[]; stderr: string[] } => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    if (test?.logs) {
      if (Array.isArray(test.logs)) stdout.push(...test.logs);
      else if (typeof test.logs === 'string' && test.logs.trim()) stdout.push(test.logs);
    }
    if (test?.stdout_logs && Array.isArray(test.stdout_logs)) stdout.push(...test.stdout_logs);
    if (test?.test_entry?.stdout_logs && Array.isArray(test.test_entry.stdout_logs)) stdout.push(...test.test_entry.stdout_logs);
    if (test?.test_entry?.logs) {
      if (Array.isArray(test.test_entry.logs)) stdout.push(...test.test_entry.logs);
      else if (typeof test.test_entry.logs === 'string' && test.test_entry.logs.trim()) stdout.push(test.test_entry.logs);
    }
    if (test?.stderr_logs && Array.isArray(test.stderr_logs)) stderr.push(...test.stderr_logs);
    if (test?.test_entry?.stderr_logs && Array.isArray(test.test_entry.stderr_logs)) stderr.push(...test.test_entry.stderr_logs);

    const uniqueStdout = [...new Set(stdout)].filter(Boolean);
    const uniqueStderr = [...new Set(stderr)].filter(Boolean);

    return { stdout: uniqueStdout, stderr: uniqueStderr };
  }, [test]);

  const totalLogs = extractLogs.stdout.length + extractLogs.stderr.length;

  if (totalLogs === 0) return null;

  return (
    <div className="ml-12 space-y-3 transition-colors duration-300">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500/70 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Terminal size={14} />
        Console Output ({totalLogs} lines)
        {extractLogs.stderr.length > 0 && (
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 ml-2">
            <AlertCircle size={12} />
            {extractLogs.stderr.length} errors
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Terminal Window Header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/5 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
            </div>
            <span className="text-[9px] font-mono text-muted ml-2">console_stream</span>
          </div>

          {/* Terminal Logs Content */}
          <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-background/50">
            <pre className="text-[11px] font-mono leading-relaxed">
              {extractLogs.stdout.map((log, idx) => {
                const formattedLog = formatLogLine(log);
                const isWarning = log.toLowerCase().includes('warn');
                const isStep = log.includes('⏭️') || log.toLowerCase().includes('step:');
                const isSuccess = log.includes('✅') || log.toLowerCase().includes('success');
                const isInfo = log.includes('ℹ️') || log.toLowerCase().includes('info');

                return (
                  <div
                    key={`stdout-${idx}`}
                    className={cn(
                      "py-0.5 border-l-2 pl-3 mb-1 transition-colors",
                      isWarning && "border-amber-500/50 text-amber-700 dark:text-amber-400",
                      isStep && "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
                      isSuccess && "border-green-500/50 text-green-700 dark:text-green-400",
                      isInfo && "border-blue-500/50 text-blue-700 dark:text-blue-400",
                      !isWarning && !isStep && !isSuccess && !isInfo && "border-border text-foreground/70"
                    )}
                  >
                    <span className="text-muted/40 select-none mr-3 w-6 inline-block font-bold">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {formattedLog}
                  </div>
                );
              })}

              {extractLogs.stdout.length > 0 && extractLogs.stderr.length > 0 && (
                <div className="my-4 border-t border-rose-500/20 pt-2">
                  <span className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest">
                    stderr_trace_dump
                  </span>
                </div>
              )}

              {extractLogs.stderr.map((log, idx) => {
                const formattedLog = formatLogLine(log);
                return (
                  <div
                    key={`stderr-${idx}`}
                    className="py-0.5 border-l-2 pl-3 mb-1 border-rose-500/50 text-rose-700 dark:text-rose-400"
                  >
                    <span className="text-rose-600/40 dark:text-rose-600 select-none mr-3 w-6 inline-block font-bold">
                      {String(extractLogs.stdout.length + idx + 1).padStart(2, '0')}
                    </span>
                    {formattedLog}
                  </div>
                );
              })}
            </pre>
          </div>

          {/* Terminal Footer */}
          <div className="px-4 py-2 bg-muted/5 border-t border-border flex justify-between items-center">
            <span className="text-[9px] font-mono text-muted">
              {extractLogs.stdout.length} stdout_lines • {extractLogs.stderr.length} stderr_faults
            </span>
            <span className="text-[9px] font-mono text-muted opacity-60">
              {test?.test_entry?.metadata?.timestamp || test?.timestamp || 'SYNC_LIVE'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}