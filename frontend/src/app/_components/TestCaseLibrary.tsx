'use client';
import React, { useEffect, useState, useMemo } from "react";
import { getMasterTestCases, uploadMasterTestCases, updateTestCase } from "@/lib/actions";
import { Search, Upload, Edit3, Save, X, Folder, ChevronDown, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { cn } from "@/lib/utils";

export default function TestCaseLibrary() {
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const data = await getMasterTestCases();
    setMasterCases(data);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    setLoading(true);
    await updateTestCase(editingId!, editForm);
    setEditingId(null);
    await loadData();
    setLoading(false);
  };

  const filtered = useMemo(() => masterCases.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.caseCode.toLowerCase().includes(searchQuery.toLowerCase())
  ), [masterCases, searchQuery]);

  return (
    /* 🔥 FIX 1: flex-1 and min-h-0 allow the container to fill space and scroll internally */
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b]">
      
      {/* HEADER SECTION (Static) */}
      <div className="p-6 lg:p-10 pb-0 space-y-8 shrink-0">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Requirement Library</h1>
            <p className="text-zinc-500 text-sm">Manage {masterCases.length} master requirements</p>
          </div>
          <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest cursor-pointer transition-all shadow-lg shrink-0">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Import Master"}
            <input type="file" className="hidden" accept=".json,.csv" />
          </label>
        </header>

        <div className="bg-black/20 border border-white/5 rounded-xl flex items-center px-4 gap-3 focus-within:border-indigo-500/50 transition-all">
          <Search className="w-4 h-4 text-zinc-600" />
          <input 
            placeholder="Search requirements..." 
            className="bg-transparent border-none focus:ring-0 w-full py-3 text-sm text-zinc-200 outline-none" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* 🔥 FIX 2: This is the scrollable container */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 pt-6 custom-scrollbar">
        <div className="bg-[#0c0c0e] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          
          {/* 🔥 FIX 3: overflow-x-auto prevents the horizontal overlap with sidebar */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-white/[0.02] text-[10px] font-black uppercase text-zinc-500 tracking-widest sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-6">Code</th>
                  <th className="p-6">Title</th>
                  <th className="p-6">Priority</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(tc => (
                  <tr key={tc.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="p-6 font-bold text-indigo-500 text-xs whitespace-nowrap">{tc.caseCode}</td>
                    <td className="p-6 text-sm text-zinc-200 min-w-[300px]">{tc.title}</td>
                    <td className="p-6 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] uppercase font-black text-zinc-500">
                        {tc.priority}
                      </span>
                    </td>
                    <td className="p-6 text-right whitespace-nowrap">
                      <button 
                        onClick={() => { setEditingId(tc.id); setEditForm(tc); }} 
                        className="p-2 hover:bg-indigo-500/10 rounded-lg text-indigo-500 transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="p-20 text-center text-zinc-600 uppercase text-xs font-bold tracking-widest">
              No requirements found matching your search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}