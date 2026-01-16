import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  sub: string;
  icon: ReactNode;
}

export function MetricCard({ title, value, sub, icon }: MetricCardProps) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-[2.5rem] shadow-xl hover:border-white/10 transition-all">
      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 w-fit mb-4">{icon}</div>
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</h3>
      <div className="text-3xl font-black text-white tracking-tighter mt-1 tabular-nums">{value}</div>
      <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-tight">{sub}</p>
    </div>
  );
}