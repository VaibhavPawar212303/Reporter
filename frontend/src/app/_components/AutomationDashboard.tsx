'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases } from "@/lib/actions";
import { createClient } from "@supabase/supabase-js";
import { DashboardHeader } from "../(route)/cypress/dashboard/_components/DashboardHeader";
import { SpecFileCard } from "../(route)/cypress/dashboard/_components/SpecFileCard";
import { CoverageGap } from "../(route)/cypress/dashboard/_components/CoverageGap";


const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [specSearch, setSpecSearch] = useState('');
  const [expandedTests, setExpandedTests] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    const [history, master] = await Promise.all([getBuildHistory(), getMasterTestCases()]);
    setBuilds(history);
    setMasterCases(master);
    //@ts-ignore
    if (history?.length > 0) setSelectedBuild(prev => history.find(b => b.id === (prev?.id || history[0].id)));
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 2000);
    const channel = supabase.channel('db').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_results' }, () => loadData()).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  const masterMap = useMemo(() => masterCases.reduce((acc, tc) => ({ ...acc, [tc.caseCode]: tc }), {}), [masterCases]);

  const specGroups = useMemo(() => {
    return selectedBuild?.results?.reduce((acc: any, res: any) => {
      const fileName = res.specFile;
      if (specSearch && !fileName.toLowerCase().includes(specSearch.toLowerCase())) return acc;
      
      const filtered = res.tests.filter((t: any) => filterStatus === 'all' || t.status === filterStatus);
      if (filtered.length > 0) {
        if (!acc[fileName]) acc[fileName] = { specFile: fileName, tests: [], video: null };
        if (!acc[fileName].video) acc[fileName].video = filtered.find((t: any) => t.video_url)?.video_url;
        acc[fileName].tests.push(...filtered.map((t: any) => ({ ...t, specId: res.id, specFile: fileName })));
      }
      return acc;
    }, {});
  }, [selectedBuild, filterStatus, specSearch]);

  const toggleTest = (id: string) => setExpandedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="flex h-full flex-col p-10 space-y-12 overflow-y-auto">
      <DashboardHeader
        selectedBuild={selectedBuild} 
        masterCases={masterCases} 
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        specSearch={specSearch} setSpecSearch={setSpecSearch}
      />
      
      <div className="space-y-16">
        {Object.entries(specGroups || {}).sort().map(([name, data]: [string, any]) => (
          <SpecFileCard 
            key={name} projectName={name} data={data} 
            masterMap={masterMap} expandedTests={expandedTests} toggleTest={toggleTest} 
          />
        ))}
      </div>

      <CoverageGap selectedBuild={selectedBuild} masterCases={masterCases} filterStatus={filterStatus} />
    </div>
  );
}