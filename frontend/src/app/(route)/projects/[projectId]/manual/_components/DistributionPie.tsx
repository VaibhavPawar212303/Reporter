import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export function DistributionPie({ metrics, isDark }: { metrics: any, isDark: boolean }) {
  // Recharts requires objects with 'name' and 'value'
  const data = [
    { name: 'AUTO', value: metrics.automated, color: '#10b981' },
    { name: 'MANUAL', value: metrics.manual, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-card border border-border p-6 rounded-sm flex flex-col items-center justify-center relative overflow-hidden group h-full min-h-[160px]">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
      
      <div className="w-full flex-1 relative min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={data} 
              innerRadius="60%" 
              outerRadius="85%" 
              paddingAngle={5} 
              dataKey="value" 
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} opacity={isDark ? 0.8 : 1} />
              ))}
            </Pie>
            <Tooltip 
               contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-foreground">{metrics.rate}%</span>
          <span className="text-[7px] font-black text-muted uppercase tracking-widest">Bot ROI</span>
        </div>
      </div>
    </div>
  );
}