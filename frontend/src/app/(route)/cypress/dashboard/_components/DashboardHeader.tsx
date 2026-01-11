import React, { useMemo } from "react";
import { Hash, Activity, Search, ListFilter } from "lucide-react";
import { FilterButton } from "./FilterButton";

export function DashboardHeader({ 
  selectedBuild, 
  masterCases, 
  filterStatus, 
  setFilterStatus, 
  projectSearch, 
  setProjectSearch 
}: any) {
  
  // 🔥 Calculate Coverage Stats for the Header
  const coverage = useMemo(() => {
    if (!selectedBuild || masterCases.length === 0) return { percent: 0, total: 0, automated: 0 };
    const automatedCodes = new Set();
    selectedBuild.results?.forEach((spec: any) => {
      spec.tests.forEach((test: any) => {
        const codes = test.case_codes || (test.case_code ? [test.case_code] : []);
        codes.forEach((c: string) => automatedCodes.add(c));
      });
    });
    const automatedCount = masterCases.filter((mc: any) => automatedCodes.has(mc.caseCode)).length;
    return {
      total: masterCases.length,
      automated: automatedCount,
      percent: Math.round((automatedCount / masterCases.length) * 100)
    };
  }, [selectedBuild, masterCases]);

  // 🔥 Calculate Build Stats for Filter Counts
  const buildStats = useMemo(() => {
    const stats = { total: 0, passed: 0, failed: 0, running: 0 };
    selectedBuild?.results?.forEach((spec: any) => {
      spec.tests.forEach((t: any) => {
        stats.total++;
        if (t.status === 'running') stats.running++;
        else if (t.status === 'passed' || t.status === 'expected') stats.passed++;
        else stats.failed++;
      });
    });
    return stats;
  }, [selectedBuild]);

  return (
    <header className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-white tracking-tighter tabular-nums">Build #{selectedBuild?.id}</h1>
            <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] font-black text-indigo-400 uppercase tracking-widest">{selectedBuild?.environment}</span>
          </div>
          <p className="text-zinc-500 text-sm">Reviewing execution across your project environments</p>
        </div>

        {/* Automation Coverage Gauge */}
        <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-4 rounded-3xl shadow-xl">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/5" />
              <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" 
                strokeDasharray={150.8} strokeDashoffset={150.8 - (150.8 * coverage.percent) / 100}
                className="text-indigo-500 transition-all duration-1000"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-white">{coverage.percent}%</span>
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Coverage</span>
            <span className="text-xs font-bold text-zinc-300">{coverage.automated} / {coverage.total} Requirements</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex items-center gap-2 bg-[#111113] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-hide">
          <FilterButton active={filterStatus === 'all'} label="All" count={buildStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
          <FilterButton active={filterStatus === 'passed'} label="Passed" count={buildStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
          <FilterButton active={filterStatus === 'failed'} label="Failed" count={buildStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
          <FilterButton active={filterStatus === 'running'} label="Running" count={buildStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
        </div>
        <div className="flex items-center gap-3 px-4 bg-[#111113] border border-white/5 rounded-2xl group focus-within:border-indigo-500/30 transition-all">
          <Search className="w-4 h-4 text-zinc-600 group-focus-within:text-indigo-500" />
          <input 
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            placeholder="Filter by project name..."
            className="bg-transparent border-none focus:ring-0 text-sm py-3 w-full text-zinc-300 placeholder:text-zinc-600 outline-none"
          />
        </div>
      </div>
    </header>
  );
}