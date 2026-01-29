'use client';

import React, { useEffect, useState, useMemo } from "react";
import { getDashboardStats } from "@/lib/actions";
import { Zap, Shield, Activity, Globe, Cpu, PlayCircle, TrendingUp, BarChart3, ChevronRight, Loader2, Server, Command, Box } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { StatusBadge } from "../cypress/_components/StatusBadge";




export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🟢 State for filtering by Project
  const [activeProjectId, setActiveProjectId] = useState<string | number | 'all'>('all');

  useEffect(() => {
    getDashboardStats().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  // 1. 🟢 Extract unique projects from the builds data
  const projectsList = useMemo(() => {
    if (!data?.builds) return [];
    const unique = new Map();
    data.builds.forEach((b: any) => {
      if (b.projectId && !unique.has(b.projectId)) {
        unique.set(b.projectId, b.projectName || `Project_${b.projectId}`);
      }
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  // 2. 🟢 Create a filtered view of the data based on active tab
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (activeProjectId === 'all') return data;

    return {
      ...data,
      builds: data.builds.filter((b: any) => b.projectId === activeProjectId),
      results: data.results.filter((r: any) => r.projectId === activeProjectId)
    };
  }, [data, activeProjectId]);

  // 3. 🟢 Metrics calculation (now uses filteredData)
  const metrics = useMemo(() => {
    if (!filteredData) return null;
    const automatedCodes = new Set();
    let totalPassed = 0;
    let totalFailed = 0;

    filteredData.results?.forEach((row: any) => {
      const testsArray = Array.isArray(row.tests) ? row.tests : [];
      testsArray.forEach((t: any) => {
        const status = t.status?.toLowerCase();
        if (['passed', 'expected', 'success'].includes(status)) totalPassed++;
        if (['failed', 'error', 'fail'].includes(status)) totalFailed++;
        const codes = t.case_codes || [];
        codes.forEach((c: string) => { if (c && c !== 'N/A') automatedCodes.add(c); });
      });
    });

    const coverage = data.totalRequirements > 0 ? Math.round((automatedCodes.size / data.totalRequirements) * 100) : 0;
    return {
      coverage,
      successRate: (totalPassed + totalFailed) > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0,
      automatedCount: automatedCodes.size,
      activeBuilds: filteredData.builds.filter((b: any) => b.status === 'running').length
    };
  }, [filteredData, data?.totalRequirements]);

  // 4. 🟢 Chart Data calculation (now uses filteredData)
  const chartData = useMemo(() => {
    if (!filteredData) return { pw: [], cy: [] };
    const getTrend = (type: string) => {
      return filteredData.builds
        .filter((b: any) => b.type?.toLowerCase() === type)
        .slice(0, 10).reverse()
        .map((b: any) => {
          let passed = 0; let total = 0;
          filteredData.results.filter((r: any) => r.buildId === b.id).forEach((r: any) => {
            const tests = typeof r.tests === 'string' ? JSON.parse(r.tests) : r.tests;
            tests?.forEach((t: any) => {
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
    <div className="h-screen flex items-center justify-center bg-[#09090b]">
      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-[#0c0c0e] custom-scrollbar font-sans">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Server size={12} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Infrastructure / Analytics / {activeProjectId === 'all' ? 'Global' : 'Project_Scoped'}</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Command size={28} className="text-indigo-500" />
            Control Tower
          </h1>
        </div>
      </header>

      {/* 🟢 PROJECT TABS */}
      <div className="flex items-center gap-1 bg-[#111114] border border-zinc-800 p-1 rounded-sm overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveProjectId('all')}
          className={cn(
            "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm",
            activeProjectId === 'all' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Global_Fleet
        </button>
        <div className="w-px h-4 bg-zinc-800 mx-2" />
        {projectsList.map((project) => (
          <button
            key={project.id}
            onClick={() => setActiveProjectId(project.id)}
            className={cn(
              "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm whitespace-nowrap",
              activeProjectId === project.id ? "bg-zinc-800 text-white border border-zinc-700" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {project.name}
          </button>
        ))}
      </div>

      {/* STATS GRID - Uses filtered metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Automation Coverage" value={`${metrics?.coverage}%`} sub={`${metrics?.automatedCount} / ${data.totalRequirements} Cases`} icon={<Shield size={18} />} color="indigo" />
        <StatCard title="Active Executions" value={metrics?.activeBuilds} sub="Live Workers" icon={<Activity size={18} />} pulse={metrics?.activeBuilds > 0} color="amber" />
        <StatCard title="Success Probability" value={`${metrics?.successRate}%`} sub="Historical Stability" icon={<Zap size={18} />} color="emerald" />
        <StatCard title="Total Registry" value={filteredData?.builds.length} sub="Build Objects" icon={<BarChart3 size={18} />} color="zinc" />
      </div>

      {/* TREND CHARTS - Uses filtered chartData */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartContainer title="Playwright Reliability Trend" data={chartData.pw} color="#10b981" gradientId="gradPw" />
        <ChartContainer title="Cypress Reliability Trend" data={chartData.cy} color="#6366f1" gradientId="gradCy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {/* RECENT ACTIVITY - Uses filtered builds */}
        <div className="lg:col-span-2 bg-[#111114] border border-zinc-800 rounded-sm shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-zinc-500" />
              Latest Transmissions
            </h2>
            <span className="text-[9px] font-mono text-zinc-600 uppercase">Project: {activeProjectId === 'all' ? 'All' : activeProjectId}</span>
          </div>
          <div className="p-2 divide-y divide-zinc-800/50">
            {filteredData?.builds.slice(0, 6).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={cn("w-1 h-8 rounded-full",
                    b.type === 'playwright' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]")}>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 font-mono">BUILD_REF_{b.id}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-bold tracking-tighter">
                      {b.type} • {b.environment} • {new Date(b.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={b.status} />
                  <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
            ))}
            {filteredData?.builds.length === 0 && (
              <div className="p-12 text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Zero Builds found for this Project</div>
            )}
          </div>
        </div>

        {/* PROGRESS PANEL */}
        <div className="bg-[#111114] border border-zinc-800 rounded-sm shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
            <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} className="text-zinc-500" />
              Coverage Velocity
            </h2>
          </div>
          <div className="p-10 flex-1 flex flex-col justify-center items-center">
            <div className="text-center space-y-2 mb-8">
              <div className="text-7xl font-light text-white tracking-tighter font-mono">{metrics?.coverage}%</div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Requirement Sync</p>
            </div>
            <div className="w-full space-y-6">
              <div className="h-1.5 w-full bg-zinc-800 rounded-none overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${metrics?.coverage}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-800/50 w-full">
                <div>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Automated</p>
                  <p className="text-2xl font-bold text-zinc-100 font-mono">{metrics?.automatedCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Master List</p>
                  <p className="text-2xl font-bold text-zinc-100 font-mono">{data.totalRequirements}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ... StatCard and ChartContainer components stay exactly the same

// --- Square AWS Components ---

function ChartContainer({ title, data, color, gradientId }: any) {
  return (
    <div className="bg-[#111114] border border-zinc-800 rounded-sm shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <h2 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">{title}</h2>
        <div className="w-2 h-2 rounded-full bg-zinc-800" />
      </div>
      <div className="h-[250px] w-full p-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }} dy={10} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', boxShadow: '0 10px 15px rgba(0,0,0,0.5)' }}
              itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}
            />
            {/* Maintain Total Line for context */}
            <Area type="monotone" dataKey="total" stroke="#3f3f46" strokeWidth={1} fill="transparent" strokeDasharray="4 4" />
            {/* Smooth Monotone Curve as requested */}
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
      "bg-[#111114] border border-zinc-800 border-t-2 rounded-sm p-8 shadow-sm hover:bg-zinc-900/50 transition-all duration-300 group",
      accentColors[color]
    )}>
      <div className="flex justify-between items-center mb-6">
        <div className="text-zinc-500 group-hover:text-white transition-colors">{icon}</div>
        {pulse && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
      </div>
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-white tracking-tighter font-mono leading-none">{value ?? '0'}</div>
      <p className="text-[9px] text-zinc-600 font-bold mt-3 uppercase italic tracking-widest">{sub}</p>
    </div>
  );
}