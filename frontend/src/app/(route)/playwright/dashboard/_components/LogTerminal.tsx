'use client';

import React from "react";
import { Terminal, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const formatLogLine = (line: string): string => {
  if (!line) return '';
  // Remove ANSI escape codes
  return line.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
};

interface LogTerminalProps {
  test: any;
}

export function LogTerminal({ test }: LogTerminalProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // 🔥 FIX: Extract logs from ALL possible sources
  const extractLogs = React.useMemo((): { stdout: string[]; stderr: string[] } => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    // ═══════════════════════════════════════════════════════════
    // STDOUT SOURCES
    // ═══════════════════════════════════════════════════════════

    // Source 1: Direct logs array at top level
    if (test?.logs) {
      if (Array.isArray(test.logs)) {
        stdout.push(...test.logs);
      } else if (typeof test.logs === 'string' && test.logs.trim()) {
        stdout.push(test.logs);
      }
    }

    // Source 2: stdout_logs at top level
    if (test?.stdout_logs && Array.isArray(test.stdout_logs)) {
      stdout.push(...test.stdout_logs);
    }

    // Source 3: test_entry.stdout_logs (from Playwright reporter payload)
    if (test?.test_entry?.stdout_logs && Array.isArray(test.test_entry.stdout_logs)) {
      stdout.push(...test.test_entry.stdout_logs);
    }

    // Source 4: test_entry.logs
    if (test?.test_entry?.logs) {
      if (Array.isArray(test.test_entry.logs)) {
        stdout.push(...test.test_entry.logs);
      } else if (typeof test.test_entry.logs === 'string' && test.test_entry.logs.trim()) {
        stdout.push(test.test_entry.logs);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STDERR SOURCES
    // ═══════════════════════════════════════════════════════════

    // Source 5: stderr_logs at top level
    if (test?.stderr_logs && Array.isArray(test.stderr_logs)) {
      stderr.push(...test.stderr_logs);
    }

    // Source 6: test_entry.stderr_logs
    if (test?.test_entry?.stderr_logs && Array.isArray(test.test_entry.stderr_logs)) {
      stderr.push(...test.test_entry.stderr_logs);
    }

    // Deduplicate while preserving order
    const uniqueStdout = [...new Set(stdout)].filter(Boolean);
    const uniqueStderr = [...new Set(stderr)].filter(Boolean);

    return { stdout: uniqueStdout, stderr: uniqueStderr };
  }, [test]);

  const totalLogs = extractLogs.stdout.length + extractLogs.stderr.length;

  if (totalLogs === 0) {
    return null; // Don't render if no logs
  }

  return (
    <div className="ml-12 space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-emerald-500/50 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Terminal size={14} />
        Console Output ({totalLogs} lines)
        {extractLogs.stderr.length > 0 && (
          <span className="flex items-center gap-1 text-red-400 ml-2">
            <AlertCircle size={12} />
            {extractLogs.stderr.length} errors
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>
            <span className="text-[9px] font-mono text-zinc-600 ml-2">console</span>
          </div>

          {/* Terminal Content */}
          <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            <pre className="text-[11px] font-mono leading-relaxed">
              {/* STDOUT Logs */}
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
                      "py-0.5 border-l-2 pl-3 mb-1",
                      isWarning && "border-yellow-500/50 text-yellow-400",
                      isStep && "border-emerald-500/50 text-emerald-400",
                      isSuccess && "border-green-500/50 text-green-400",
                      isInfo && "border-blue-500/50 text-blue-400",
                      !isWarning && !isStep && !isSuccess && !isInfo && "border-zinc-700 text-zinc-400"
                    )}
                  >
                    <span className="text-zinc-600 select-none mr-3 w-6 inline-block">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {formattedLog}
                  </div>
                );
              })}

              {/* Separator if both stdout and stderr exist */}
              {extractLogs.stdout.length > 0 && extractLogs.stderr.length > 0 && (
                <div className="my-4 border-t border-red-500/20 pt-2">
                  <span className="text-[9px] font-black text-red-500/50 uppercase tracking-widest">
                    stderr output
                  </span>
                </div>
              )}

              {/* STDERR Logs */}
              {extractLogs.stderr.map((log, idx) => {
                const formattedLog = formatLogLine(log);
                return (
                  <div
                    key={`stderr-${idx}`}
                    className="py-0.5 border-l-2 pl-3 mb-1 border-red-500/50 text-red-400"
                  >
                    <span className="text-red-600 select-none mr-3 w-6 inline-block">
                      {String(extractLogs.stdout.length + idx + 1).padStart(2, '0')}
                    </span>
                    {formattedLog}
                  </div>
                );
              })}
            </pre>
          </div>

          {/* Terminal Footer */}
          <div className="px-4 py-2 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-mono text-zinc-700">
              {extractLogs.stdout.length} stdout, {extractLogs.stderr.length} stderr
            </span>
            <span className="text-[9px] font-mono text-zinc-700">
              {test?.test_entry?.metadata?.timestamp || test?.timestamp || ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}