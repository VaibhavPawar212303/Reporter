"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Download, Activity, Bug, LayoutGrid, FolderTree, Database } from 'lucide-react';
import BugAudit from './_components/BugAudit';
import TaskRegistry from './_components/TaskRegistry';
import HierarchyExplorer from './_components/HierarchyExplorer';
import LWSprintAudit from './_components/LWSprintAudit';

export default function BugTracker() {
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'audit' | 'all' | 'hierarchy' | 'lw'>('audit');

  // --- THE CORE LOGIC: PROCESS & SORT HIERARCHY ---
  const processedData = useMemo(() => {
    if (rawTasks.length === 0) return [];

    // 1. Tagging Logic (Mapping tags to names)
    const tagged = rawTasks.map(task => {
      let typeTag = "[TASK]";
      if (task.parent) typeTag = "[SUBTASK]";
      else if (task.custom_item_id === process.env.NEXT_PUBLIC_BUG_TYPE_ID) typeTag = "[BUG]";
      else if (task.custom_item_id === process.env.NEXT_PUBLIC_HOTFIX_TYPE_ID) typeTag = "[HOTFIX]";
      else if (task.custom_item_id === 1) typeTag = "[MILESTONE]";

      return {
        ...task,
        displayName: `${typeTag} ${task.name}`,
        typeTag: typeTag
      };
    });

    // 2. Hierarchical Sorting (Parent -> Children)
    const finalList: any[] = [];
    const parents = tagged.filter(t => !t.parent);
    const subtasks = tagged.filter(t => t.parent);

    parents.forEach(parent => {
      finalList.push(parent);
      const children = subtasks.filter(sub => sub.parent === parent.id);
      finalList.push(...children);
    });

    // Add orphans (subtasks whose parents are in different folders or not fetched)
    const orphans = subtasks.filter(sub => !finalList.find(f => f.id === sub.id));
    return [...finalList, ...orphans];
  }, [rawTasks]);

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setRawTasks(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // --- CSV EXPORT ENGINE ---
  const exportCSV = () => {
    const headers = ["ID", "Type", "Name", "Status", "List", "Folder", "Assignees", "URL"];
    const rows = processedData.map(t => [
      t.id, t.typeTag, `"${t.name.replace(/"/g, '""')}"`, t.status.status, t.list.name, t.folder?.name || "N/A", 
      `"${t.assignees?.map((a: any) => a.username).join(", ") || "Unassigned"}"`, t.url
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sigma_Audit_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-400 font-sans">
      <nav className="border-b border-zinc-800 bg-[#09090b] px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-white font-black uppercase text-lg italic">
            <Activity className="text-indigo-500" /> SIGMA_COMMAND
          </div>
          <div className="flex bg-black p-1 rounded-sm border border-zinc-800">
            <NavBtn active={view === 'audit'} label="Sprint_Audit" onClick={() => setView('audit')} />
            <NavBtn active={view === 'lw'} label="LW_Sprints" onClick={() => setView('lw')} />
            <NavBtn active={view === 'all'} label="Registry" onClick={() => setView('all')} />
            <NavBtn active={view === 'hierarchy'} label="Hierarchy" onClick={() => setView('hierarchy')} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={exportCSV} className="text-[10px] font-black uppercase border border-zinc-800 px-4 py-2 hover:bg-white hover:text-black transition-all flex items-center gap-2">
            <Download size={14}/> Export_CSV
          </button>
          <button onClick={loadData} className="p-2 hover:text-white transition-colors">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </nav>

      <main className="p-8">
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin" />
            <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-indigo-500">Establishing_Data_Link...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {view === 'audit' && <BugAudit tasks={rawTasks} />}
            {view === 'lw' && <LWSprintAudit tasks={rawTasks} />}
            {view === 'all' && <TaskRegistry tasks={processedData} />}
            {view === 'hierarchy' && <HierarchyExplorer tasks={rawTasks} />}
          </div>
        )}
      </main>
    </div>
  );
}

function NavBtn({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-6 py-2 text-[10px] font-black uppercase transition-all rounded-sm ${active ? 'bg-zinc-800 text-indigo-400 shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>
      {label}
    </button>
  );
}