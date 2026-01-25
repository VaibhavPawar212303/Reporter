// _components/FilterButton.tsx
export function FilterButton({ active, label, count, onClick, color }: any) {
  const colorClasses: any = {
    green: active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'hover:bg-green-500/5 text-zinc-500 border-transparent',
    red: active ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'hover:bg-red-500/5 text-zinc-500 border-transparent',
    indigo: active ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'hover:bg-indigo-500/5 text-zinc-500 border-transparent',
    zinc: active ? 'bg-zinc-100/10 text-zinc-100 border-white/20' : 'hover:bg-white/5 text-zinc-500 border-transparent'
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap shadow-sm ${colorClasses[color]}`}>
      {label}
      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/10' : 'bg-black/20'}`}>{count}</span>
    </button>
  );
}