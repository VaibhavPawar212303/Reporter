'use client';
import React, { useEffect, useState, useMemo, Fragment } from "react";
import Papa from "papaparse";
import { uploadMasterTestCases, getMasterTestCases, updateTestCase } from "@/lib/actions";
import { Edit3, Save, X, Loader2, CheckCircle2, AlertCircle, Search, Folder, Zap, BookOpen, ChevronDown, Upload, Hash, Type, Beaker, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestCaseManager() {
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });
  
  // Filters
  const [idFilter, setIdFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Edit States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const loadData = async () => {
    const data = await getMasterTestCases();
    setMasterCases(data);
  };

  useEffect(() => { loadData(); }, []);

  const uniqueModules = useMemo(() => ["all", ...new Set(masterCases.map(c => c.moduleName).filter(Boolean))], [masterCases]);

  const filteredCases = useMemo(() => {
    return masterCases.filter(c => 
      c.caseCode.toLowerCase().includes(idFilter.toLowerCase()) &&
      c.title.toLowerCase().includes(titleFilter.toLowerCase()) &&
      (moduleFilter === "all" || c.moduleName === moduleFilter)
    );
  }, [masterCases, idFilter, titleFilter, moduleFilter]);

  const handleSave = async () => {
    setLoading(true);
    const res = await updateTestCase(editingId!, editForm);
    if (res.success) {
      setEditingId(null);
      await loadData();
      setStatus({ type: 'success', msg: "Update saved!" });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-[#09090b]">
      <header className="flex justify-between items-end">
        <h1 className="text-4xl font-black text-white tracking-tighter">Test Case Library</h1>
        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
          <span className="text-xl font-black text-white">{masterCases.length}</span>
          <span className="text-[10px] text-zinc-500 font-bold ml-2 uppercase">Requirements</span>
        </div>
      </header>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl flex items-center px-4 gap-3">
          <Hash className="w-4 h-4 text-zinc-600" />
          <input placeholder="Filter ID..." className="bg-transparent border-none focus:ring-0 w-full py-4 text-sm" value={idFilter} onChange={e => setIdFilter(e.target.value)} />
        </div>
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl flex items-center px-4 gap-3">
          <Type className="w-4 h-4 text-zinc-600" />
          <input placeholder="Filter Title..." className="bg-transparent border-none focus:ring-0 w-full py-4 text-sm" value={titleFilter} onChange={e => setTitleFilter(e.target.value)} />
        </div>
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl flex items-center px-4 gap-3">
          <Filter className="w-4 h-4 text-zinc-600" />
          <select className="bg-transparent border-none focus:ring-0 w-full py-4 text-sm text-zinc-400" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
             <option value="all">All Modules</option>
             {uniqueModules.filter(m => m !== 'all').map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-white/[0.02] text-[10px] font-black uppercase text-zinc-500 tracking-widest border-b border-white/5">
              <tr>
                <th className="p-6">ID</th>
                <th className="p-6">Module</th>
                <th className="p-6">Title</th>
                <th className="p-6">Mode</th>
                <th className="p-6">Priority</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCases.map((tc) => (
                <Fragment key={tc.id}>
                  <tr onClick={() => editingId !== tc.id && setExpandedId(expandedId === tc.id ? null : tc.id)} className="hover:bg-white/[0.01] cursor-pointer transition-colors">
                    <td className="p-6 font-bold text-indigo-500">{tc.caseCode}</td>
                    <td className="p-6 text-[10px] font-bold text-zinc-500 uppercase">{tc.moduleName}</td>
                    <td className="p-6 text-sm text-zinc-200">{tc.title}</td>
                    <td className="p-6 text-[10px] font-black text-zinc-500 uppercase">{tc.mode}</td>
                    <td className="p-6">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/5 ${tc.priority === 'critical' ? 'text-red-500 bg-red-500/10' : 'text-zinc-500'}`}>
                        {tc.priority}
                      </span>
                    </td>
                    <td className="p-6 text-right"><ChevronDown className={cn("w-4 h-4 text-zinc-700", expandedId === tc.id && "rotate-180")} /></td>
                  </tr>

                  {expandedId === tc.id && (
                    <tr className="bg-white/[0.01] border-l-2 border-indigo-500">
                      <td colSpan={6} className="p-10">
                        <div className="flex justify-between items-center mb-8">
                          <h3 className="text-lg font-bold text-white">Requirement Configuration</h3>
                          {editingId === tc.id ? (
                            <div className="flex gap-2">
                              <button onClick={handleSave} className="bg-green-600 px-4 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-2"><Save className="w-3" /> Save</button>
                              <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-white/5 text-zinc-400 rounded-xl text-xs font-bold">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingId(tc.id); setEditForm({...tc}); }} className="bg-indigo-600/10 px-4 py-2 text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:bg-indigo-600/20"><Edit3 className="w-3" /> Edit</button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-indigo-500">Manual Steps</label>
                            {editingId === tc.id ? 
                              <textarea className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs h-40" value={editForm.steps} onChange={e => setEditForm({...editForm, steps: e.target.value})} /> 
                              : <div className="text-xs text-zinc-400 whitespace-pre-wrap bg-black/20 p-6 rounded-3xl">{tc.steps || "N/A"}</div>
                            }
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-green-500">Expected Result</label>
                            {editingId === tc.id ? 
                              <textarea className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs h-40" value={editForm.expectedResult} onChange={e => setEditForm({...editForm, expectedResult: e.target.value})} /> 
                              : <div className="text-xs text-zinc-300 italic bg-green-500/5 p-6 rounded-3xl">{tc.expectedResult || "N/A"}</div>
                            }
                          </div>
                        </div>

                        {editingId === tc.id && (
                          <div className="grid grid-cols-3 gap-6 mt-10 p-6 bg-white/5 rounded-3xl">
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Title</label>
                                <input className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Mode</label>
                                <select className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs" value={editForm.mode} onChange={e => setEditForm({...editForm, mode: e.target.value})}>
                                    <option value="Automation">Automation</option>
                                    <option value="Manual">Manual</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Type</label>
                                <input className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}