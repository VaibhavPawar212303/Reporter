'use client';

import React, { useMemo } from "react";
import { FileCode, Monitor, Cpu, Search, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardHeader({ 
  selectedBuild, 
  masterCases, 
  filterStatus, 
  setFilterStatus, 
  projectSearch, 
  setProjectSearch,
  specSearch,
  setSpecSearch 
}: any) {
  
  const buildStats = useMemo(() => {
    const stats = { total: 0, passed: 0, failed: 0, running: 0, automatedCount: 0 };
    const automatedCodes = new Set<string>();

    if (selectedBuild && Array.isArray(selectedBuild.results)) {
      selectedBuild.results.forEach((spec: any) => {
        if (Array.isArray(spec.tests)) {
          spec.tests.forEach((t: any) => {
            stats.total++;
            const status = t.status?.toLowerCase();
            if (status === 'running') stats.running++;
            else if (status === 'passed' || status === 'expected' || status === 'success') stats.passed++;
            else stats.failed++;

            if (Array.isArray(t.case_codes)) {
              t.case_codes.forEach((code: string) => {
                if (code && code !== 'N/A') automatedCodes.add(code);
              });
            }
          });
        }
      });
    }
    stats.automatedCount = automatedCodes.size;
    return stats;
  }, [selectedBuild]);

  const masterCount = masterCases?.length || 0;
  const coveragePercent = masterCount > 0 
    ? Math.round((buildStats.automatedCount / masterCount) * 100) 
    : 0;

  return (
    <header className="flex flex-col gap-1 font-mono">
      {/* Top Banner: Build Info & Coverage */}
      <div className="flex flex-col lg:flex-row bg-[#16181d] border border-zinc-800 rounded-none shadow-xl">
        
        {/* Left Side: Build Identity */}
        <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-zinc-800 flex items-center gap-6">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
             <Cpu className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                Build #{selectedBuild?.id ?? '---'}
              </h1>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 font-bold uppercase tracking-widest">
                {selectedBuild?.type || 'Standard'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">
              {selectedBuild?.environment || 'Environment_Unknown'} • PROD_VAL_STREAM
            </p>
          </div>
        </div>

        {/* Right Side: Rectangular Coverage Stats */}
        <div className="w-full lg:w-96 p-6 bg-zinc-900/20 flex flex-col justify-center gap-3">
          <div className="flex justify-between items-end">
             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Automation Coverage</span>
             <span className="text-xs font-bold text-white tabular-nums">{coveragePercent}%</span>
          </div>
          {/* Square Progress Bar */}
          <div className="h-2 w-full bg-zinc-800 rounded-none overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-1000" 
              style={{ width: `${coveragePercent}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-[9px] text-zinc-600 font-bold uppercase">
             <span>{buildStats.automatedCount} TC Linked</span>
             <span>{masterCount} Total Cases</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="grid grid-cols-1 xl:grid-cols-2 mt-1">
        {/* Filter Group */}
        <div className="flex bg-[#16181d] border border-zinc-800 p-1">
          <FilterButton active={filterStatus === 'all'} label="Total" count={buildStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
          <FilterButton active={filterStatus === 'passed'} label="Passed" count={buildStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
          <FilterButton active={filterStatus === 'failed'} label="Failed" count={buildStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
          <FilterButton active={filterStatus === 'running'} label="Running" count={buildStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
        </div>
      </div>
    </header>
  );
}

export function FilterButton({ active, label, count, onClick, color }: any) {
  const colorClasses: any = {
    green: active ? 'bg-green-500/10 text-green-500 border-green-500/40' : 'text-zinc-500 border-transparent hover:text-zinc-300',
    red: active ? 'bg-red-500/10 text-red-500 border-red-500/40' : 'text-zinc-500 border-transparent hover:text-zinc-300',
    indigo: active ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/40' : 'text-zinc-500 border-transparent hover:text-zinc-300',
    zinc: active ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'text-zinc-500 border-transparent hover:text-zinc-300'
  };

  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex-1 flex items-center justify-between px-4 py-2 border transition-all rounded-none",
        colorClasses[color]
      )}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className={cn(
        "ml-2 text-[10px] font-mono px-1.5 py-0.5",
        active ? "bg-black/40" : "bg-black/20"
      )}>
        {count}
      </span>
    </button>
  );
}