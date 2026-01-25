export function StatusBadge({ status }: { status: string }) {
  const isRunning = status === 'running';
  const isFailed = status === 'failed';
  const color = isFailed ? 'bg-red-500/10 text-red-500' : isRunning ? 'bg-indigo-500/10 text-indigo-500 animate-pulse' : 'bg-green-500/10 text-green-500';
  return <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase ${color}`}>{status}</span>;
}