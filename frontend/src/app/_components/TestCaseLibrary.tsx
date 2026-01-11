'use client';
import React, { useEffect, useState, useMemo } from "react";
import { getMasterTestCases, uploadMasterTestCases, updateTestCase } from "@/lib/actions";
import { Search, Upload, Edit3, Save, X, Folder, ChevronDown, Loader2 } from "lucide-react";
import Papa from "papaparse";

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
    <div className="h-full overflow-y-auto p-10 space-y-8 bg-[#09090b]">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white">Requirement Library</h1>
          <p className="text-zinc-500 text-sm">Manage {masterCases.length} master requirements</p>
        </div>
        <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest cursor-pointer transition-all shadow-lg">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Import Master"}
          <input type="file" className="hidden" accept=".json,.csv" onChange={(e) => {/* ... upload logic ... */}} />
        </label>
      </header>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2rem] overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.01]">
            <div className="bg-black/20 border border-white/5 rounded-xl flex items-center px-4 gap-3 focus-within:border-indigo-500/50 transition-all">
                <Search className="w-4 h-4 text-zinc-600" />
                <input placeholder="Search requirements..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/[0.02] text-[10px] font-black uppercase text-zinc-500 tracking-widest">
            <tr>
              <th className="p-6">Code</th>
              <th className="p-6">Title</th>
              <th className="p-6">Priority</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(tc => (
              <tr key={tc.id} className="hover:bg-white/[0.01] transition-colors">
                <td className="p-6 font-bold text-indigo-500 text-xs">{tc.caseCode}</td>
                <td className="p-6 text-sm text-zinc-200">{tc.title}</td>
                <td className="p-6"><span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] uppercase font-black text-zinc-500">{tc.priority}</span></td>
                <td className="p-6 text-right">
                  <button onClick={() => { setEditingId(tc.id); setEditForm(tc); }} className="p-2 hover:bg-indigo-500/10 rounded-lg text-indigo-500 transition-all"><Edit3 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}