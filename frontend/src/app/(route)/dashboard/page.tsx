'use client';

import React, { useEffect, useState, useMemo } from "react";
import { getDashboardStats } from "@/lib/actions";
import { Zap, Shield, Activity, Globe, Cpu, PlayCircle, TrendingUp, BarChart3, ChevronRight, Loader2, Server, Command, Box } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { StatusBadge } from "../cypress/_components/StatusBadge";
import { useTheme } from "next-themes";

export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // 🟢 State for filtering by Project
  const [activeProjectId, setActiveProjectId] = useState<string | number | 'all'>('all');

  useEffect(() => {
    getDashboardStats().then(res => {
      if (res && !res.error) {
        setData(res);
      } else {
        setData({ builds: [], results: [], projects: [], totalRequirements: 0 });
      }
      setLoading(false);
    });
  }, []);

  const projectsList = useMemo(() => {
    if (!data?.builds || !Array.isArray(data.builds)) return [];
    const unique = new Map();
    data.builds.forEach((b: any) => {
      if (b.projectId && !unique.has(b.projectId)) {
        unique.set(b.projectId, b.projectName || `Project_${b.projectId}`);
      }
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return { builds: [], results: [] };
    if (activeProjectId === 'all') return data;

    return {
      ...data,
      builds: (data.builds || []).filter((b: any) => b.projectId === activeProjectId),
      results: (data.results || []).filter((r: any) => r.projectId === activeProjectId)
    };
  }, [data, activeProjectId]);

  const metrics = useMemo(() => {
    if (!filteredData) return { coverage: 0, successRate: 0, automatedCount: 0, activeBuilds: 0 };
    
    const automatedCodes = new Set();
    let totalPassed = 0;
    let totalFailed = 0;

    const results = filteredData.results || [];
    results.forEach((row: any) => {
      let testsArray = [];
      try {
        testsArray = typeof row.tests === 'string' ? JSON.parse(row.tests) : row.tests;
      } catch (e) { testsArray = []; }

      if (Array.isArray(testsArray)) {
        testsArray.forEach((t: any) => {
          const status = t.status?.toLowerCase();
          if (['passed', 'expected', 'success'].includes(status)) totalPassed++;
          if (['failed', 'error', 'fail'].includes(status)) totalFailed++;
          const codes = t.case_codes || [];
          codes.forEach((c: string) => { if (c && c !== 'N/A') automatedCodes.add(c); });
        });
      }
    });

    const totalReqs = data?.totalRequirements || 0;
    const coverage = totalReqs > 0 ? Math.round((automatedCodes.size / totalReqs) * 100) : 0;
    
    return {
      coverage,
      successRate: (totalPassed + totalFailed) > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0,
      automatedCount: automatedCodes.size,
      activeBuilds: (filteredData.builds || []).filter((b: any) => b.status === 'running').length
    };
  }, [filteredData, data?.totalRequirements]);

  const chartData = useMemo(() => {
    if (!filteredData) return { pw: [], cy: [] };
    
    const getTrend = (type: string) => {
      return (filteredData.builds || [])
        .filter((b: any) => b.type?.toLowerCase() === type)
        .slice(0, 10).reverse()
        .map((b: any) => {
          let passed = 0; let total = 0;
          const buildResults = (filteredData.results || []).filter((r: any) => r.buildId === b.id);
          
          buildResults.forEach((r: any) => {
            let tests = [];
            try {
               tests = typeof r.tests === 'string' ? JSON.parse(r.tests) : r.tests;
            } catch(e) { tests = []; }

            (tests || []).forEach((t: any) => {
              total++;
              if (['passed', 'expected', 'success'].includes(t.status?.toLowerCase())) passed++;
            });
          });
          return { name: `#${b.id}`, passed, total };
        });
    };
    return { pw: getTrend('playwright'), cy: getTrend('cypress') };
  }, [filteredData]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-muted animate-spin" />
    </div>
  );

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-background custom-scrollbar font-sans selection:bg-indigo-500/30">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-8">
        <div>
          <div className="flex items-center gap-2 text-muted mb-2">
             <Server size={12} />
             <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Infrastructure / Analytics / {activeProjectId === 'all' ? 'Global' : 'Scoped'}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3 uppercase">
            <Command size={28} className="text-indigo-500" />
            Control Tower
          </h1>
        </div>
      </header>

      {/* PROJECT TABS */}
      <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-none overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveProjectId('all')}
          className={cn(
            "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none",
            activeProjectId === 'all' ? "bg-foreground text-background shadow-lg" : "text-muted hover:text-foreground"
          )}
        >
          Total_Registry
        </button>
        <div className="w-px h-4 bg-border mx-2" />
        {projectsList.map((project) => (
          <button 
            key={project.id}
            onClick={() => setActiveProjectId(project.id)}
            className={cn(
              "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none whitespace-nowrap",
              activeProjectId === project.id ? "bg-muted/20 text-foreground border border-border" : "text-muted hover:text-foreground"
            )}
          >
            {project.name}
          </button>
        ))}
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Automation Coverage" value={`${metrics?.coverage || 0}%`} sub={`${metrics?.automatedCount || 0} / ${data?.totalRequirements || 0} Cases`} icon={<Shield size={18}/>} color="indigo" />
        <StatCard title="Active Executions" value={metrics?.activeBuilds || 0} sub="Live Workers" icon={<Activity size={18}/>} pulse={(metrics?.activeBuilds || 0) > 0} color="amber" />
        <StatCard title="Success Probability" value={`${metrics?.successRate || 0}%`} sub="Historical Stability" icon={<Zap size={18}/>} color="emerald" />
        <StatCard title="Total Registry" value={filteredData?.builds?.length || 0} sub="Build Objects" icon={<BarChart3 size={18}/>} color="zinc" />
      </div>

      {/* TREND CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer title="Playwright Reliability Trend" data={chartData.pw} color="#10b981" gradientId="gradPw" theme={theme} />
        <ChartContainer title="Cypress Reliability Trend" data={chartData.cy} color="#6366f1" gradientId="gradCy" theme={theme} />
      </div>

      {/* RECENT ACTIVITY & PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        <div className="lg:col-span-2 bg-card border border-border rounded-none shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center justify-between uppercase">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className="text-muted" />
                    Latest Transmissions
                </h2>
                <span className="text-[9px] font-mono text-muted">Project_ID: {activeProjectId}</span>
            </div>
            <div className="p-2 divide-y divide-border">
                {(filteredData?.builds || []).slice(0, 6).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between p-4 hover:bg-foreground/[0.02] transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className={cn("w-1 h-8 rounded-none", 
                                b.type === 'playwright' ? "bg-emerald-500" : "bg-indigo-500")}>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-foreground font-mono">BUILD_REF_{b.id}</h3>
                                <p className="text-[10px] text-muted uppercase mt-0.5 font-bold tracking-tighter">
                                  {b.type} • {b.environment} • {new Date(b.createdAt).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <StatusBadge status={b.status} />
                            <ChevronRight size={14} className="text-muted group-hover:text-foreground transition-colors" />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-card border border-border rounded-none shadow-sm flex flex-col items-center justify-center p-10">
            <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-4">Coverage_Velocity</p>
            <div className="text-7xl font-bold text-foreground tracking-tighter font-mono">{metrics?.coverage || 0}%</div>
            <div className="w-full space-y-4 mt-6">
                <div className="h-1.5 w-full bg-border rounded-none overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${metrics?.coverage || 0}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-muted uppercase tracking-widest">
                    <span>Synchronized</span>
                    <span>Target: 100%</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// --- Square themed Components ---

function ChartContainer({ title, data, color, gradientId, theme }: any) {
  const isDark = theme === 'dark';
  return (
    <div className="bg-card border border-border rounded-none shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-muted tracking-widest uppercase">{title}</h2>
          <div className="w-2 h-2 rounded-full bg-border" />
      </div>
      <div className="h-[250px] w-full p-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data || []}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27272a" : "#e4e4e7"} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 10, fontWeight: 700}} dy={10} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
               contentStyle={{backgroundColor: isDark ? '#18181b' : '#fff', border: `1px solid ${isDark ? '#3f3f46' : '#e4e4e7'}`, borderRadius: '0px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}}
               itemStyle={{fontSize: '11px', fontWeight: 'bold', color: isDark ? '#fff' : '#000'}}
            />
            <Area type="monotone" dataKey="passed" stroke={color} strokeWidth={3} fill={`url(#${gradientId})`} fillOpacity={1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, pulse, color }: any) {
  const accentColors: any = {
    indigo: 'border-t-indigo-500',
    amber: 'border-t-amber-500',
    emerald: 'border-t-emerald-500',
    zinc: 'border-t-zinc-500'
  };

  return (
    <div className={cn(
      "bg-card border border-border border-t-2 rounded-none p-8 shadow-sm hover:bg-muted/5 transition-all duration-300 group",
      accentColors[color]
    )}>
      <div className="flex justify-between items-center mb-6">
        <div className="text-muted group-hover:text-foreground transition-colors">{icon}</div>
        {pulse && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
      </div>
      <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-foreground tracking-tighter font-mono leading-none">{value ?? '0'}</div>
      <p className="text-[9px] text-muted font-bold mt-3 uppercase italic tracking-widest">{sub}</p>
    </div>
  );
}