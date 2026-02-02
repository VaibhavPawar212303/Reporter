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
    <header className="flex flex-col gap-1 font-mono transition-colors duration-300">
      {/* Top Banner: Build Info & Coverage */}
      <div className="flex flex-col lg:flex-row bg-card border border-border rounded-none shadow-xl">
        
        {/* Left Side: Build Identity */}
        <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-border flex items-center gap-6">
          <div className="w-12 h-12 bg-background border border-border flex items-center justify-center shrink-0">
             <Cpu className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                Build #{selectedBuild?.id ?? '---'}
              </h1>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 font-bold uppercase tracking-widest">
                {selectedBuild?.type || 'Standard'}
              </span>
            </div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-2">
              {selectedBuild?.environment || 'Environment_Unknown'} • PROD_VAL_STREAM
            </p>
          </div>
        </div>

        {/* Right Side: Rectangular Coverage Stats */}
        <div className="w-full lg:w-96 p-6 bg-muted/5 flex flex-col justify-center gap-3">
          <div className="flex justify-between items-end">
             <span className="text-[10px] font-black text-muted uppercase tracking-widest">Automation Coverage</span>
             <span className="text-xs font-bold text-foreground tabular-nums">{coveragePercent}%</span>
          </div>
          {/* Square Progress Bar */}
          <div className="h-2 w-full bg-border rounded-none overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.3)]" 
              style={{ width: `${coveragePercent}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-[9px] text-muted font-bold uppercase">
             <span>{buildStats.automatedCount} TC Linked</span>
             <span>{masterCount} Total Cases</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="grid grid-cols-1 xl:grid-cols-2 mt-1">
        {/* Filter Group */}
        <div className="flex bg-card border border-border p-1 gap-1">
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
    green: active 
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/40' 
      : 'text-muted border-transparent hover:bg-muted/5 hover:text-foreground',
    red: active 
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/40' 
      : 'text-muted border-transparent hover:bg-muted/5 hover:text-foreground',
    indigo: active 
      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/40' 
      : 'text-muted border-transparent hover:bg-muted/5 hover:text-foreground',
    zinc: active 
      ? 'bg-foreground text-background border-foreground font-black' 
      : 'text-muted border-transparent hover:bg-muted/5 hover:text-foreground'
  };

  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex-1 flex items-center justify-between px-4 py-2 border transition-all rounded-none",
        colorClasses[color]
      )}
    >
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
      <span className={cn(
        "ml-2 text-[10px] font-mono px-1.5 py-0.5 min-w-[20px] text-center",
        active 
          ? (color === 'zinc' ? "bg-background/20" : "bg-foreground/10") 
          : "bg-muted/10"
      )}>
        {count}
      </span>
    </button>
  );
}