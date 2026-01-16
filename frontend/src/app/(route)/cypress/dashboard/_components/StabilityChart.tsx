import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";

export function StabilityChart({ data, specFileNames }: { data: any[], specFileNames: string[] }) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-indigo-500" /></div>
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Stability Trend</h2>
          <p className="text-[9px] text-zinc-500 font-bold uppercase">Pass rate over last 10 builds</p>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} dy={10} />
            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }} />
            {specFileNames.map((name, i) => (
              <Area key={name} type="monotone" dataKey={name} stroke={i % 2 === 0 ? '#6366f1' : '#a855f7'} fill="transparent" strokeWidth={2} connectNulls />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}