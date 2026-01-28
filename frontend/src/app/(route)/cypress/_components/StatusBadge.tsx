import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  // Normalize status to handle Case Sensitivity and Nulls
  const s = status?.toLowerCase() || 'unknown';

  const isPassed = ['passed', 'success', 'expected'].includes(s);
  const isFailed = ['failed', 'fail', 'error'].includes(s);
  const isRunning = s === 'running';
  const isSkipped = s === 'skipped' || s === 'pending';

  const colorStyles = isFailed 
    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
    : isRunning 
      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse' 
      : isPassed 
        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'; // Default for skipped/unknown

  return (
    <span className={cn(
      "text-[9px] px-2 py-0.5 rounded-none font-bold tracking-widest uppercase whitespace-nowrap",
      colorStyles
    )}>
      {status || 'N/A'}
    </span>
  );
}