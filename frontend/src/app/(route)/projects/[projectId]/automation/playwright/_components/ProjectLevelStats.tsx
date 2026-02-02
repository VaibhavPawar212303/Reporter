'use client';

import React from 'react';
import { cn } from "@/lib/utils";

interface ProjectLevelStatsProps {
  tests: any[];
}

export function ProjectLevelStats({ tests }: ProjectLevelStatsProps) {
  // Aggregate data for this specific project (Browser/Worker)
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const active = tests.filter(t => t.status === 'running').length;
  
  // Calculate stability for this specific project
  const totalFinished = passed + failed;
  const stability = totalFinished > 0 
    ? Math.round((passed / totalFinished) * 100) 
    : 0;

  return (
    <div className="flex gap-6 items-center bg-card/50 px-6 py-2 rounded-2xl border border-border shadow-sm backdrop-blur-sm transition-colors duration-300">
      
      {/* Project Stability Metric */}
      <div className="flex flex-col items-end pr-2 border-r border-border">
        <span className="text-[10px] font-black text-foreground leading-none">{stability}%</span>
        <span className="text-[7px] font-bold text-muted uppercase tracking-widest mt-1">Stability</span>
      </div>

      {/* Passed Count */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 leading-none">{passed}</span>
        <span className="text-[8px] font-bold text-muted uppercase tracking-tighter mt-1">Passed</span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Failed Count */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-rose-600 dark:text-rose-500 leading-none">{failed}</span>
        <span className="text-[8px] font-bold text-muted uppercase tracking-tighter mt-1">Failed</span>
      </div>

      {/* Active/Running Count - Pulses when workers are active */}
      {active > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 animate-pulse leading-none">{active}</span>
            <span className="text-[8px] font-bold text-muted uppercase tracking-tighter mt-1">Active</span>
          </div>
        </>
      )}
    </div>
  );
}