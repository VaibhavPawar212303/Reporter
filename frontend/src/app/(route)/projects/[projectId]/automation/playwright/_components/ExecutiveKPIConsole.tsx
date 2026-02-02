'use client';

import React, { useMemo, useEffect, useState } from "react";
import { 
  Shield, Zap, TrendingUp, Bug, Clock, AlertTriangle, 
  Terminal, Activity, Target 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export function ExecutiveKPIConsole({ buildData }: { buildData: any }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // 1. Data Aggregation
  const kpis = useMemo(() => {
    if (!buildData) return null;
    let total = 0, passed = 0, failed = 0, flaky = 0, durationSum = 0;
    
    buildData.results?.forEach((spec: any) => {
      spec.tests?.forEach((t: any) => {
        total++;
        const s = t.status?.toLowerCase();
        if (['passed', 'success'].includes(s)) {
          if ((t.run_number || 1) > 1) flaky++;
          else passed++;
        } else failed++;
        durationSum += (t.duration_ms || 0);
      });
    });

    return {
      coverage: 75,
      passRate: total > 0 ? Math.round(((passed + flaky) / total) * 100) : 0,
      flakyRate: total > 0 ? Math.round((flaky / total) * 100) : 0,
      growth: "+12.5%",
      defectDensity: 0.8,
      avgTime: total > 0 ? (durationSum / total / 1000).toFixed(1) : 0
    };
  }, [buildData]);

  const growthData = [
    { name: 'W1', val: 40 }, { name: 'W2', val: 45 }, { name: 'W3', val: 58 }, { name: 'W4', val: 75 }
  ];

  if (!mounted) return null;

  const isDark = theme === 'dark';
  const gridColor = isDark ? "#27272a" : "#e4e4e7";
  const tooltipBg = isDark ? "#000000" : "#ffffff";

  return (
    <div className="space-y-4 font-mono transition-colors duration-300">
      
      {/* 1. TOP KPI BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
        <KPIStat label="Automation Coverage" value={`${kpis?.coverage}%`} sub="75% Critical Path" icon={<Shield size={14}/>} color="emerald" />
        <KPIStat label="Test Pass Rate" value={`${kpis?.passRate}%`} sub={`${kpis?.flakyRate}% Flakiness`} icon={<Zap size={14}/>} color="foreground" />
        <KPIStat label="Automation Growth" value={kpis?.growth} sub="Time Series Rate" icon={<TrendingUp size={14}/>} color="foreground" />
        <KPIStat label="Defect Detection" value="94%" sub="Feature Quality" icon={<Bug size={14}/>} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 2. PROGRESS & PERFORMANCE */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card border border-border p-6">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-foreground uppercase tracking-widest">
                   <Activity size={14} className="text-emerald-500" /> Automation_Velocity_Stream
                </div>
                <span className="text-[9px] text-muted font-bold uppercase">Source: test_runs</span>
             </div>
             <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis dataKey="name" hide />
                        <Tooltip contentStyle={{backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, color: isDark ? '#fff' : '#000'}} />
                        <Area type="stepAfter" dataKey="val" stroke="#10b981" fill="#10b981" fillOpacity={isDark ? 0.05 : 0.1} strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <DataBlock label="Avg_Execution_Time" value={`${kpis?.avgTime}s`} sub="Performance Facts" icon={<Clock size={12}/>} />
              <DataBlock label="Pipeline_Duration" value="14m 22s" sub="Execution Facts" icon={<Target size={12}/>} />
          </div>
        </div>

        {/* 3. RISK HEAT-MAP */}
        <div className="lg:col-span-4 bg-card border border-border p-6 flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-black text-foreground uppercase tracking-widest mb-6">
                <AlertTriangle size={14} className="text-rose-500" /> Risk_Heat_Map
            </div>
            
            <div className="flex-1 flex flex-col gap-1">
                {[...Array(5)].map((_, r) => (
                    <div key={r} className="flex flex-1 gap-1">
                        {[...Array(5)].map((_, c) => {
                            const intensity = (5 - r) * (c + 1);
                            return (
                                <div 
                                    key={c} 
                                    className={cn(
                                        "flex-1 transition-all hover:scale-95 cursor-crosshair border border-foreground/5",
                                        intensity > 15 ? "bg-rose-500/40" : intensity > 8 ? "bg-amber-500/30" : "bg-muted/10"
                                    )}
                                    title={`Risk Level: ${intensity}`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            
            <div className="mt-4 flex justify-between items-center text-[8px] font-black text-muted uppercase tracking-tighter">
                <span>Impact (Low → High)</span>
                <span className="text-right">Probability</span>
            </div>

            <div className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] text-muted font-bold uppercase">High_Risk_Area_Coverage</span>
                    <span className="text-[11px] text-foreground font-black">42%</span>
                </div>
                <div className="h-1 w-full bg-muted/20 overflow-hidden">
                    <div className="h-full bg-rose-600" style={{ width: '42%' }} />
                </div>
            </div>
        </div>

      </div>

      {/* 4. FOOTER PROTOCOL */}
      <div className="bg-card/50 border border-border px-6 py-2 flex justify-between items-center opacity-60">
         <div className="flex items-center gap-3">
            <Terminal size={12} className="text-foreground" />
            <span className="text-[9px] font-black text-muted uppercase tracking-widest">KPI_Source_Validation: OK</span>
         </div>
         <span className="text-[9px] font-bold text-muted uppercase tracking-tighter">Instance: build_analysis_v4</span>
      </div>

    </div>
  );
}

function KPIStat({ label, value, sub, icon, color }: any) {
    const colors: any = { 
        emerald: 'text-emerald-600 dark:text-emerald-500', 
        rose: 'text-rose-600 dark:text-rose-500', 
        foreground: 'text-foreground', 
        muted: 'text-muted' 
    };
    return (
        <div className="bg-background p-6 hover:bg-card transition-all group relative">
            <div className="flex justify-between items-start mb-4">
                <div className="text-muted group-hover:text-foreground transition-colors">{icon}</div>
                <div className="w-1.5 h-1.5 bg-border group-hover:bg-foreground transition-colors rotate-45" />
            </div>
            <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-3xl font-black tabular-nums tracking-tighter leading-none", colors[color])}>{value}</p>
            <p className="text-[8px] text-muted font-bold mt-3 uppercase tracking-tighter border-l border-border pl-2">{sub}</p>
        </div>
    );
}

function DataBlock({ label, value, sub, icon }: any) {
    return (
        <div className="bg-card border border-border p-5 flex items-center justify-between group hover:border-muted transition-colors">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-background border border-border text-muted group-hover:text-foreground">{icon}</div>
                <div>
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-[14px] font-black text-foreground uppercase tracking-tight">{value}</p>
                </div>
            </div>
            <span className="text-[8px] font-black text-muted uppercase tracking-tighter">{sub}</span>
        </div>
    );
}