'use client';

import React, { useEffect, useState, useMemo } from "react";
import { getDashboardStats } from "@/lib/actions";
import { 
  Zap, Shield, Activity, Globe, Cpu, PlayCircle, 
  Play, TrendingUp, BarChart3, Loader2
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';

import { cn } from "@/lib/utils";
// Ensure this path is correct based on your folder structure
import { StatusBadge } from "../(route)/cypress/dashboard/_components/StatusBadge";

export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  // 🔥 1. Calculate Overall Metrics by scanning the JSONB 'tests' arrays
  const metrics = useMemo(() => {
    if (!data) return null;
    const automatedCodes = new Set();
    let totalPassed = 0;
    let totalFailed = 0;

    data.builds.forEach((b: any) => {
      b.results?.forEach((spec: any) => {
        // results table has a 'tests' column which is our JSONB array
        const testsArray = Array.isArray(spec.tests) ? spec.tests : [];
        
        testsArray.forEach((t: any) => {
          const status = t.status?.toLowerCase();
          if (status === 'passed' || status === 'expected' || status === 'success') totalPassed++;
          if (status === 'failed' || status === 'error') totalFailed++;

          // Extract unique case codes for coverage
          const codes = t.case_codes || (t.case_code ? [t.case_code] : []);
          codes.forEach((c: string) => {
            if (c && c !== 'N/A' && c !== 'UNKNOWN') automatedCodes.add(c);
          });
        });
      });
    });

    const totalReqs = data.totalRequirements || 1; // Prevent div by zero
    const coverage = Math.round((automatedCodes.size / totalReqs) * 100);
    
    const totalExecuted = totalPassed + totalFailed;
    const successRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;

    return {
      coverage,
      totalPassed,
      totalFailed,
      successRate,
      automatedCount: automatedCodes.size,
      activeBuilds: data.builds.filter((b: any) => b.status === 'running').length
    };
  }, [data]);

  // 🔥 2. Transform Data for Split Charts (PW vs CY)
  const transformBuildData = (builds: any[]) => {
    return builds
      .slice(0, 8) // Last 8 builds per framework
      .reverse()   // Chronological order for chart
      .map((b: any) => {
        let buildPassed = 0;
        let buildTotal = 0;
        
        b.results?.forEach((spec: any) => {
          const testsArray = Array.isArray(spec.tests) ? spec.tests : [];
          testsArray.forEach((t: any) => {
            buildTotal++;
            const status = t.status?.toLowerCase();
            if (status === 'passed' || status === 'expected' || status === 'success') buildPassed++;
          });
        });
        
        return { 
          name: `#${b.id}`, 
          passed: buildPassed, 
          total: buildTotal 
        };
      });
  };

  const playwrightData = useMemo(() => 
    data ? transformBuildData(data.builds.filter((b: any) => b.type === 'playwright')) : [], 
  [data]);

  const cypressData = useMemo(() => 
    data ? transformBuildData(data.builds.filter((b: any) => b.type === 'cypress')) : [], 
  [data]);

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-[#09090b]">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-10 space-y-10 overflow-y-auto h-full custom-scrollbar bg-[#09090b]">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Command Center</h1>
        <p className="text-zinc-500 text-sm mt-1">Cross-framework execution health and requirement coverage.</p>
      </header>

      {/* TOP STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Overall Coverage" value={`${metrics?.coverage}%`} sub={`${metrics?.automatedCount} Automated`} icon={<Shield className="text-indigo-500" />} />
        <StatCard title="Active Executions" value={metrics?.activeBuilds} sub="Workers streaming" icon={<Activity className="text-yellow-500" />} pulse={metrics?.activeBuilds > 0} />
        <StatCard title="Master Library" value={data.totalRequirements} sub="Defined Test Cases" icon={<Globe className="text-emerald-500" />} />
        <StatCard title="Success Rate" value={`${metrics?.successRate}%`} sub="Across all history" icon={<Zap className="text-orange-500" />} />
      </div>

      {/* TREND CHARTS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <ChartContainer 
            title="Playwright Reliability" 
            data={playwrightData} 
            icon={<Cpu className="text-green-400" />} 
            color="#10b981" 
            gradientId="colorPw" 
        />
        <ChartContainer 
            title="Cypress Reliability" 
            data={cypressData} 
            icon={<PlayCircle className="text-indigo-400" />} 
            color="#6366f1" 
            gradientId="colorCy" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT BUILDS */}
        <div className="lg:col-span-2 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Latest Activity</h2>
            <div className="space-y-4">
                {data.builds.slice(0, 6).map((b: any) => (
                    <div key={b.id} className="group flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-5">
                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border", 
                                b.type === 'playwright' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-500")}>
                                {b.type === 'playwright' ? <Cpu className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                                  Build #{b.id} 
                                  <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">{b.type}</span>
                                </h3>
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter mt-0.5">{new Date(b.createdAt).toLocaleDateString()} • {b.environment}</p>
                            </div>
                        </div>
                        <StatusBadge status={b.status} />
                    </div>
                ))}
            </div>
        </div>

        {/* PROGRESS BOX */}
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <h2 className="text-xl font-black uppercase tracking-tighter relative z-10">Automation Progress</h2>
            <div className="py-14 text-center">
                 <div className="text-8xl font-black tracking-tighter">{metrics?.coverage}%</div>
                 <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-2">Library Coverage</p>
            </div>
            <div className="bg-black/20 p-6 rounded-3xl backdrop-blur-md border border-white/10 space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>{metrics?.automatedCount} Automated</span>
                    <span>{data.totalRequirements} Total</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${metrics?.coverage}%` }} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function ChartContainer({ title, data, icon, color, gradientId }: any) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
      <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/5">{icon}</div>
          <h2 className="text-sm font-black text-white tracking-widest uppercase">{title}</h2>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 9, fontWeight: 800}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 9, fontWeight: 800}} />
            <Tooltip 
              contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px'}}
              itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
            />
            <Area type="monotone" dataKey="total" stroke="#3f3f46" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="passed" stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, pulse }: any) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-[2rem] shadow-xl hover:border-indigo-500/10 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform border border-white/5">{icon}</div>
        {pulse && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />}
      </div>
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</h3>
      <div className="text-3xl font-black text-white tracking-tight mt-1">{value}</div>
      <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase">{sub}</p>
    </div>
  );
}