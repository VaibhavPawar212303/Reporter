'use client';
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  // Normalize status to handle Case Sensitivity and Nulls
  const s = status?.toLowerCase() || 'unknown';

  const isPassed = ['passed', 'success', 'expected'].includes(s);
  const isFailed = ['failed', 'fail', 'error'].includes(s);
  const isRunning = s === 'running';

  const colorStyles = isFailed 
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20' 
    : isRunning 
      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 animate-pulse' 
      : isPassed 
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20'
        : 'bg-muted/10 text-muted border-border'; // Fallback for skipped/unknown

  return (
    <span className={cn(
      "text-[9px] px-2 py-0.5 rounded-none font-black tracking-widest uppercase whitespace-nowrap border transition-all duration-300",
      colorStyles
    )}>
      {status || 'N/A'}
    </span>
  );
}