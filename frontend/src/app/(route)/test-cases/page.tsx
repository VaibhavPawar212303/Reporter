'use client';
import React, { useEffect, useState, useMemo, Fragment } from "react";
import Papa from "papaparse";
import { uploadMasterTestCases, getMasterTestCases, updateTestCase } from "@/lib/actions";
import { Edit3, Save, X, Loader2, CheckCircle2, AlertCircle, Search, Folder, Zap, BookOpen, ChevronDown, Upload, ArrowUpDown, ChevronUp, Filter, Type, Beaker, Settings2,Hash } from "lucide-react";

type SortDirection = 'asc' | 'desc' | null;

export default function TestCaseManager() {
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });
  
  // UI States
  const [idSearchQuery, setIdSearchQuery] = useState("");
  const [titleFilter, setTitleFilter] = useState(""); // 🔥 New Title specific filter
  const [moduleFilter, setModuleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<string>('caseCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Edit States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const loadData = async () => {
    const data = await getMasterTestCases();
    setMasterCases(data);
  };

  useEffect(() => { loadData(); }, []);

  // Extract unique values for filters
  const uniqueModules = useMemo(() => ["all", ...new Set(masterCases.map(c => c.moduleName).filter(Boolean))], [masterCases]);
  const uniquePriorities = useMemo(() => ["all", ...new Set(masterCases.map(c => c.priority).filter(Boolean))], [masterCases]);
  const uniqueTypes = useMemo(() => ["all", ...new Set(masterCases.map(c => c.type).filter(Boolean))], [masterCases]);
  const uniqueModes = useMemo(() => ["all", ...new Set(masterCases.map(c => c.mode).filter(Boolean))], [masterCases]);

  const handleSave = async () => {
    setLoading(true);
    const res = await updateTestCase(editingId!, editForm);
    if (res.success) {
      setEditingId(null);
      await loadData();
      setStatus({ type: 'success', msg: "Test Case updated successfully!" });
    } else {
      setStatus({ type: 'error', msg: res.error });
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let data: any[] = file.name.endsWith('.json') ? JSON.parse(content) : Papa.parse(content, {header:true}).data;
        const res = await uploadMasterTestCases(Array.isArray(data) ? data : [data]);
        if (res.success) { setStatus({ type: 'success', msg: 'Sync Complete' }); loadData(); }
      } catch (err) { setStatus({ type: 'error', msg: 'Format Error' }); }
      finally { setLoading(false); }
    };
    reader.readAsText(file);
  };

  // 🔥 Integrated Filter & Sort Logic
  const sortedAndFilteredCases = useMemo(() => {
    let result = masterCases.filter(c => {
      const matchesIdSearch = c.caseCode.toLowerCase().includes(idSearchQuery.toLowerCase());
      const matchesTitleSearch = c.title.toLowerCase().includes(titleFilter.toLowerCase()); // 🔥 Title specific check
      const matchesModule = moduleFilter === "all" || c.moduleName === moduleFilter;
      const matchesPriority = priorityFilter === "all" || c.priority === priorityFilter;
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      const matchesMode = modeFilter === "all" || c.mode === modeFilter;

      return matchesIdSearch && matchesTitleSearch && matchesModule && matchesPriority && matchesType && matchesMode;
    });

    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        let valA = a[sortKey] || '';
        let valB = b[sortKey] || '';
        if (sortKey === 'priority') {
          const weights: any = { critical: 4, high: 3, medium: 2, low: 1 };
          valA = weights[valA.toLowerCase()] || 0;
          valB = weights[valB.toLowerCase()] || 0;
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [masterCases, idSearchQuery, titleFilter, moduleFilter, priorityFilter, typeFilter, modeFilter, sortKey, sortDirection]);

  return (
    <div className="p-10 bg-[#09090b] min-h-screen text-zinc-300">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Requirement Library</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage, filter, and edit your master test repository.</p>
          </div>
          <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-sm cursor-pointer transition-all flex items-center gap-3 shadow-lg shrink-0">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
            Import Master
            <input type="file" className="hidden" accept=".csv, .json" onChange={handleFileUpload} />
          </label>
        </header>

        {/* 🔥 Filter Bar */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl flex items-center px-4 gap-3 focus-within:border-indigo-500/50 transition-all shadow-sm">
                <Hash className="w-4 h-4 text-zinc-600" />
                <input placeholder="Filter by ID (TC...)" className="bg-transparent border-none focus:ring-0 w-full py-4 text-sm text-white outline-none" value={idSearchQuery} onChange={(e) => setIdSearchQuery(e.target.value)} />
            </div>
            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl flex items-center px-4 gap-3 focus-within:border-indigo-500/50 transition-all shadow-sm">
                <Type className="w-4 h-4 text-zinc-600" />
                <input placeholder="Filter by Title keywords..." className="bg-transparent border-none focus:ring-0 w-full py-4 text-sm text-white outline-none" value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FilterSelect icon={<Folder />} label="Module" value={moduleFilter} options={uniqueModules} onChange={setModuleFilter} />
            <FilterSelect icon={<Filter />} label="Priority" value={priorityFilter} options={uniquePriorities} onChange={setPriorityFilter} />
            <FilterSelect icon={<Beaker />} label="Type" value={typeFilter} options={uniqueTypes} onChange={setTypeFilter} />
            <FilterSelect icon={<Zap />} label="Mode" value={modeFilter} options={uniqueModes} onChange={setModeFilter} />
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-[#0c0c0e] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <th className="p-6 cursor-pointer hover:text-indigo-400" onClick={() => {setSortKey('caseCode'); setSortDirection('asc')}}>Case ID</th>
                <th className="p-6">Module</th>
                <th className="p-6">Title</th>
                <th className="p-6 text-center">Priority</th>
                <th className="p-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedAndFilteredCases.map((tc) => (
                <Fragment key={tc.id}>
                  <tr onClick={() => editingId !== tc.id && setExpandedId(expandedId === tc.id ? null : tc.id)} className="hover:bg-white/[0.01] cursor-pointer transition-colors group">
                    <td className="p-6 font-bold text-indigo-500 text-xs">{tc.caseCode}</td>
                    <td className="p-6 text-[10px] font-bold text-zinc-500 uppercase">{tc.moduleName}</td>
                    <td className="p-6 text-sm font-medium text-zinc-200">{tc.title}</td>
                    <td className="p-6 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/5 ${tc.priority === 'critical' ? 'text-red-500 bg-red-500/10' : 'text-zinc-500'}`}>
                        {tc.priority}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <ChevronDown className={`w-4 h-4 text-zinc-700 transition-transform ${expandedId === tc.id ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>

                  {expandedId === tc.id && (
                    <tr className="bg-white/[0.01]">
                      <td colSpan={5} className="p-10 border-l-2 border-indigo-500">
                        <div className="flex justify-between items-start mb-8">
                          <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Test Case Configuration</h3>
                          {editingId === tc.id ? (
                            <div className="flex gap-2">
                              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold transition-all hover:bg-green-500 shadow-lg shadow-green-500/10"><Save className="w-3 h-3" /> Save Changes</button>
                              <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-white/5 text-zinc-400 rounded-xl text-xs font-bold border border-white/5">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingId(tc.id); setEditForm({...tc}); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-400 rounded-xl text-xs font-bold transition-all hover:bg-indigo-600/20"><Edit3 className="w-3 h-3" /> Edit Case</button>
                          )}
                        </div>

                        <div className="space-y-8 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 🔥 Title Edit */}
                            <div className="md:col-span-1 space-y-3">
                                <label className="text-[10px] font-black uppercase text-indigo-500">Title</label>
                                {editingId === tc.id ? 
                                  <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} /> 
                                  : <div className="text-sm font-bold text-zinc-200">{tc.title}</div>
                                }
                            </div>
                            {/* 🔥 Mode Edit */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-indigo-500">Execution Mode</label>
                                {editingId === tc.id ? 
                                  <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white" value={editForm.mode} onChange={(e) => setEditForm({...editForm, mode: e.target.value})}>
                                    <option value="Automation">Automation</option>
                                    <option value="Manual">Manual</option>
                                  </select>
                                  : <div className="text-sm text-zinc-400">{tc.mode || 'N/A'}</div>
                                }
                            </div>
                            {/* 🔥 Type Edit */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-indigo-500">Test Type</label>
                                {editingId === tc.id ? 
                                  <input className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white" value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value})} /> 
                                  : <div className="text-sm text-zinc-400 uppercase font-bold">{tc.type || 'N/A'}</div>
                                }
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-indigo-500">Steps</label>
                              {editingId === tc.id ? 
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-mono h-40 outline-none focus:border-indigo-500/50" value={editForm.steps} onChange={(e) => setEditForm({...editForm, steps: e.target.value})} /> 
                                : <div className="text-xs text-zinc-400 font-mono whitespace-pre-wrap bg-black/20 p-6 rounded-3xl border border-white/5 leading-relaxed">{tc.steps || "N/A"}</div>
                              }
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-green-500">Expected Result</label>
                              {editingId === tc.id ? 
                                <textarea className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs h-40 outline-none focus:border-green-500/50" value={editForm.expectedResult} onChange={(e) => setEditForm({...editForm, expectedResult: e.target.value})} /> 
                                : <div className="text-xs text-zinc-300 italic bg-green-500/5 p-6 rounded-3xl border border-green-500/10 leading-relaxed">{tc.expectedResult || "N/A"}</div>
                              }
                            </div>
                          </div>
                        </div>
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

// 🔥 Helper UI Component for consistent filters
function FilterSelect({ icon, label, value, options, onChange }: any) {
    return (
        <div className="bg-[#0c0c0e] border border-white/5 rounded-xl flex items-center px-3 gap-2">
            {React.cloneElement(icon, { className: "w-3.5 h-3.5 text-zinc-600" })}
            <select 
                className="bg-transparent border-none focus:ring-0 text-[11px] font-bold text-zinc-400 py-3 w-full cursor-pointer uppercase tracking-wider outline-none" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="all">{label}: All</option>
                {options.filter((o: string) => o !== 'all').map((o: string) => (
                    <option key={o} value={o}>{o}</option>
                ))}
            </select>
        </div>
    );
}