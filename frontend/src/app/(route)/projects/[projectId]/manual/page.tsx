'use client';
import React, { useEffect, useState, useMemo, Fragment } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Edit3, Save, X, Loader2, Folder, Zap, ChevronDown, ChevronRight, 
  Upload, Hash, Type, Filter, Server, Command, MousePointerClick, 
  PlayCircle, Database, Box, Target, FolderPlus, GripVertical, 
  Trash2, RefreshCw 
} from "lucide-react";
import { 
  getTestCasesByProject, updateTestCase, uploadMasterTestCases, 
  moveModule, deleteTestCase, importTestCases 
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";

/* --- 1. TREE BUILDER HELPER --- */
const buildTree = (cases: any[]) => {
  const tree: any = {};
  cases.forEach(tc => {
    const rawModule = tc.moduleName || tc.module_name || "UNGROUPED";
    const parts = rawModule.split(" / ");
    let current = tree;
    parts.forEach((part: string, index: number) => {
      if (!current[part]) {
        current[part] = { _items: [], _path: parts.slice(0, index + 1).join(" / ") };
      }
      if (index === parts.length - 1) {
        current[part]._items.push(tc);
      }
      current = current[part];
    });
  });
  return tree;
};

/* --- 2. SORTABLE FOLDER COMPONENT (THEMED) --- */
function SortableFolder({ 
  name, node, onToggle, expandedModules, expandedId, setExpandedId, 
  onSave, onCancel, editingId, setEditingId, editForm, setEditForm, 
  onDelete, renderIndexedContent 
}: any) {
  const isExpanded = expandedModules.includes(node._path);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node._path });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const auto = node._items?.filter((i: any) => i.mode?.toLowerCase() === 'automation').length || 0;
  const manual = node._items?.filter((i: any) => i.mode?.toLowerCase() === 'manual').length || 0;

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-2", isDragging && "opacity-30")}>
      <div className={cn(
        "group flex items-center justify-between px-6 py-3 bg-card border border-border rounded-sm hover:bg-muted/5 transition-all border-l-2",
        isExpanded ? "border-l-indigo-500 shadow-lg" : "border-l-transparent"
      )}>
        <div className="flex items-center gap-4">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/10 rounded-sm">
            <GripVertical size={14} className="text-muted" />
          </div>
          <div onClick={() => onToggle(node._path)} className="flex items-center gap-3 cursor-pointer select-none">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={16} className={cn(isExpanded ? "text-indigo-500 fill-indigo-500/10" : "text-muted")} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
            <div className="flex items-center bg-background/50 border border-border rounded-sm px-3 py-1 gap-4">
                <div className="flex flex-col items-center pr-3 border-r border-border">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 leading-none">{auto}</span>
                    <span className="text-[6px] text-muted font-black uppercase tracking-tighter mt-0.5">Auto</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-none">{manual}</span>
                    <span className="text-[6px] text-muted font-black uppercase tracking-tighter mt-0.5">Man</span>
                </div>
            </div>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-9 mt-2 border-l border-border pl-4 space-y-2">
          {Object.entries(node).map(([key, value]: [string, any]) => {
            if (key.startsWith('_')) return null;
            return <SortableFolder key={key} name={key} node={value} {...{onToggle, expandedModules, expandedId, setExpandedId, onSave, onCancel, editingId, setEditingId, editForm, setEditForm, onDelete, renderIndexedContent}} />;
          })}
          
          {node._items.length > 0 && (
            <div className="bg-card/30 rounded-sm border border-border divide-y divide-border overflow-hidden">
               {node._items.map((tc: any) => (
                  <Fragment key={tc.id}>
                    <div 
                      onClick={() => !editingId && setExpandedId(expandedId === tc.id ? null : tc.id)} 
                      className={cn("p-4 hover:bg-muted/5 cursor-pointer flex items-center justify-between group/row transition-all", editingId === tc.id && "bg-indigo-500/5")}
                    >
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                          <div className="w-24 shrink-0">
                            {editingId === tc.id ? (
                                <input className="bg-background border border-border rounded-sm px-2 py-1 text-indigo-500 w-full outline-none font-mono text-[10px]" value={editForm.caseCode} onClick={e => e.stopPropagation()} onChange={e => setEditForm({...editForm, caseCode: e.target.value})} />
                            ) : ( <span className="text-[10px] font-mono text-indigo-600 font-bold">{tc.caseCode}</span> )}
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            {editingId === tc.id ? (
                                <input className="bg-background border border-border rounded-sm px-3 py-1 text-xs text-foreground outline-none w-full" value={editForm.title} onClick={e => e.stopPropagation()} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                            ) : (
                                <span className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate block">{tc.title}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <span className="text-[9px] font-black text-muted uppercase tracking-widest">{tc.mode}</span>
                          <div className="flex items-center gap-2">
                             {editingId === tc.id ? (
                                <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-1.5 bg-emerald-600 text-white rounded-sm"><Save size={12}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="p-1.5 bg-muted text-foreground rounded-sm"><X size={12}/></button>
                                </div>
                             ) : (
                                <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); setEditingId(tc.id); setEditForm({...tc}); setExpandedId(tc.id); }} className="p-1.5 text-muted hover:text-indigo-500 opacity-0 group-hover/row:opacity-100 transition-all"><Edit3 size={14}/></button>
                                  <button onClick={(e) => onDelete(e, tc.id)} className="p-1.5 text-muted hover:text-rose-500 opacity-0 group-hover/row:opacity-100 transition-all"><Trash2 size={14}/></button>
                                  <ChevronDown size={14} className={cn("text-muted transition-transform", expandedId === tc.id && "rotate-180 text-indigo-500")} />
                                </div>
                             )}
                          </div>
                        </div>
                    </div>
                    {expandedId === tc.id && (
                      <div className="p-10 bg-background border-l-2 border-indigo-500/50 grid grid-cols-2 gap-10 border-y border-border">
                          <div className="space-y-4">
                              <p className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2"><Command size={10}/> Instruction_Set</p>
                              {editingId === tc.id ? <textarea className="w-full bg-background border border-border rounded-sm p-4 font-mono text-[11px] h-48 outline-none text-foreground" value={editForm.steps} onChange={e => setEditForm({...editForm, steps: e.target.value})} /> : <div className="p-5 bg-card/50 rounded-sm border border-border min-h-[12rem]">{renderIndexedContent(tc.steps, "text-indigo-500")}</div>}
                          </div>
                          <div className="space-y-4">
                              <p className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2"><Zap size={10}/> Expected_Outcome</p>
                              {editingId === tc.id ? <textarea className="w-full bg-background border border-border rounded-sm p-4 font-mono text-[11px] h-48 outline-none text-foreground" value={editForm.expectedResult} onChange={e => setEditForm({...editForm, expectedResult: e.target.value})} /> : <div className="p-5 bg-card/50 rounded-sm border border-border min-h-[12rem]">{renderIndexedContent(tc.expectedResult, "text-emerald-500")}</div>}
                          </div>
                      </div>
                    )}
                  </Fragment>
               ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --- 3. MAIN COMPONENT (THEMED) --- */
export default function TestCaseManager() {
  const { projectId } = useParams();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });

  useEffect(() => setMounted(true), []);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await getTestCasesByProject(Number(projectId));
      setMasterCases(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [projectId]);

  const filteredCases = useMemo(() => {
    return masterCases.filter(tc => {
      const matchId = !idFilter || tc.caseCode?.toLowerCase().includes(idFilter.toLowerCase());
      const matchTitle = !titleFilter || tc.title?.toLowerCase().includes(titleFilter.toLowerCase());
      const matchModule = moduleFilter === "all" || tc.moduleName === moduleFilter;
      return matchId && matchTitle && matchModule;
    });
  }, [masterCases, idFilter, titleFilter, moduleFilter]);

  const metrics = useMemo(() => {
    const total = masterCases.length;
    const automated = masterCases.filter(c => c.mode?.toLowerCase() === 'automation').length;
    const manual = masterCases.filter(c => c.mode?.toLowerCase() === 'manual').length;
    return { total, automated, manual, pending: total - (automated + manual), rate: total > 0 ? Math.round((automated/total)*100) : 0 };
  }, [masterCases]);

  const pieData = useMemo(() => [
    { name: 'AUTO', value: metrics.automated, color: '#10b981' },
    { name: 'MANUAL', value: metrics.manual, color: '#3b82f6' },
    { name: 'BACKLOG', value: metrics.pending, color: '#a1a1aa' },
  ].filter(d => d.value > 0), [metrics]);

  const tree = useMemo(() => buildTree(filteredCases), [filteredCases]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sourcePath = active.id;
    const targetPath = over.id;
    const newPath = `${targetPath} / ${sourcePath.split(" / ").pop()}`;
    if (confirm(`MOVE_FOLDER: "${sourcePath}" -> "${targetPath}"?`)) {
      setLoading(true);
      await moveModule(sourcePath, newPath);
      await loadData();
    }
  };

  const handleCreateModule = async () => {
    if (!newModuleName.trim() || !projectId) return;
    setLoading(true);
    const res = await uploadMasterTestCases([{ 
        projectId: Number(projectId),
        caseCode: `MOD-${Date.now().toString().slice(-4)}`, 
        title: "INITIALIZER", 
        moduleName: newModuleName.trim(), 
        mode: "Manual", 
        priority: "low" 
    }], Number(projectId));
    if (res.success) { setNewModuleName(""); setIsAddingModule(false); await loadData(); }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await updateTestCase(editingId!, editForm);
    if (res.success) { setEditingId(null); await loadData(); setStatus({ type: 'success', msg: "COMMIT_SUCCESS" }); }
    setLoading(false);
  };

  const handleDelete = async (e: any, id: number) => {
    e.stopPropagation();
    if (confirm("PURGE_OBJECT: Confirm removal?")) {
      setLoading(true);
      await deleteTestCase(id);
      await loadData();
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setLoading(true);
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();
    reader.onload = async (evt) => {
      try {
        let rawData: any[] = [];
        if (fileName.endsWith('.json')) rawData = JSON.parse(evt.target?.result as string);
        else if (fileName.endsWith('.csv')) {
          const csv = Papa.parse(evt.target?.result as string, { header: true, skipEmptyLines: true });
          rawData = csv.data;
        } 
        else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }
        const res = await importTestCases(Number(projectId), rawData);
        if (res.success) { await loadData(); setStatus({ type: 'success', msg: "IMPORT_SUCCESS" }); }
      } catch (err) { setStatus({ type: 'error', msg: "IMPORT_FAILED" }); }
      finally { setLoading(false); }
    };
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) reader.readAsBinaryString(file);
    else reader.readAsText(file);
  };

  const renderIndexedContent = (text: string, colorClass: string) => {
    if (!text) return <span className="opacity-20 font-mono text-[9px] uppercase tracking-widest">Data_Null</span>;
    return text.split('\n').filter(l => l.trim() !== '').map((line, idx) => (
      <div key={idx} className="flex gap-3 mb-1.5 group/line">
        <span className={cn("shrink-0 font-mono text-[9px] mt-0.5 font-bold opacity-40", colorClass)}>[{String(idx + 1).padStart(2, '0')}]</span>
        <span className="text-[11px] font-mono text-muted leading-relaxed">{line}</span>
      </div>
    ));
  };

  if (!mounted) return null;
  const isDark = theme === 'dark';

  return (
    <div className="p-8 space-y-8 bg-background h-screen overflow-y-auto custom-scrollbar text-foreground font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-8 uppercase">
        <div>
          <div className="flex items-center gap-2 text-muted mb-2 font-mono text-[10px] tracking-widest"><Server size={12} /> Registry / Instance_{projectId}</div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"><Database size={28} className="text-indigo-500" />Requirement Tree</h1>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setIsAddingModule(!isAddingModule)} className="bg-indigo-600 hover:opacity-90 text-white text-[10px] font-black px-4 py-3 rounded-sm tracking-widest flex items-center gap-2 transition-all shadow-xl"><FolderPlus size={14} /> New_Module</button>
            <div className={cn("bg-card border border-border rounded-sm p-3 flex items-center gap-4 shadow-sm transition-all", loading ? "opacity-50" : "hover:bg-muted/5")}>
                <label className="cursor-pointer group flex items-center gap-3">
                    <div className="p-2 bg-background rounded-sm border border-border">{loading ? <RefreshCw size={14} className="text-indigo-500 animate-spin" /> : <Upload size={14} className="text-muted" />}</div>
                    <div className="flex flex-col"><span className="text-[10px] font-black text-foreground tracking-widest">{loading ? "UPLOADING..." : "Sync_Metadata"}</span>{!loading && <span className="text-[8px] text-muted font-mono font-bold uppercase tracking-tighter">JSON_CSV_XLSX</span>}</div>
                    <input type="file" className="hidden" accept=".json, .csv, .xlsx, .xls" onChange={handleImport} disabled={loading} />
                </label>
            </div>
            <div className="bg-card border border-border px-4 py-2 rounded-sm font-mono text-lg font-bold text-foreground">{masterCases.length} <span className="text-[10px] text-muted tracking-widest">Objects</span></div>
        </div>
      </header>

      {isAddingModule && (
        <div className="bg-card border border-indigo-500/30 p-6 rounded-sm flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200 uppercase">
            <input autoFocus placeholder="NEW_PATH_IDENTIFIER..." className="bg-background border border-border rounded-sm px-4 py-3 text-xs font-mono text-foreground flex-1 outline-none focus:border-indigo-500" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateModule()} />
            <button onClick={handleCreateModule} className="bg-indigo-600 px-6 py-3 text-[10px] font-black rounded-sm uppercase tracking-widest transition-colors hover:opacity-90 text-white">Create_Object</button>
            <button onClick={() => setIsAddingModule(false)} className="p-2 text-muted hover:text-foreground transition-colors"><X size={18}/></button>
        </div>
      )}

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 uppercase">
                <StatCard title="Automation ROI" value={`${metrics.rate}%`} icon={<Target size={18}/>} color="emerald" />
                <StatCard title="Bot Ready" value={metrics.automated} icon={<PlayCircle size={18}/>} color="indigo" />
                <StatCard title="Manual_Ops" value={metrics.manual} icon={<MousePointerClick size={18}/>} color="amber" />
                <StatCard title="Registry" value={metrics.total} icon={<Box size={18}/>} color="zinc" />
            </div>
        </div>

        <div className="bg-card border border-border p-8 rounded-sm flex flex-col items-center justify-center relative overflow-hidden group h-[400px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
            <div className="w-full flex-1 relative min-h-0 min-w-0">
                <ResponsiveContainer width="99%" height="99%">
                    <PieChart>
                        <Pie data={pieData} innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                            {pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={isDark ? 0.8 : 1} />)}
                        </Pie>
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px', color: 'var(--muted)'}} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-10">
                    <span className="text-3xl font-bold font-mono text-foreground tracking-tighter">{metrics.rate}%</span>
                    <span className="text-[8px] font-black text-muted uppercase tracking-widest">Automation</span>
                </div>
            </div>
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-4 shrink-0">Library Distribution</span>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-card border border-border p-4 rounded-sm grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm uppercase">
        <div className="flex items-center px-4 gap-3 bg-background border border-border rounded-sm group focus-within:border-indigo-500 transition-colors">
          <Hash size={14} className="text-muted" />
          <input placeholder="ID_SEARCH..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-foreground placeholder:text-muted/50" value={idFilter} onChange={e => setIdFilter(e.target.value)} />
        </div>
        <div className="flex items-center px-4 gap-3 bg-background border border-border rounded-sm group focus-within:border-indigo-500 transition-all transition-colors">
          <Type size={14} className="text-muted" />
          <input placeholder="TITLE_MATCH..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-foreground placeholder:text-muted/50" value={titleFilter} onChange={e => setTitleFilter(e.target.value)} />
        </div>
        <div className="flex items-center px-4 gap-3 bg-background border border-border rounded-sm group focus-within:border-indigo-500 transition-colors">
          <Filter size={14} className="text-muted" />
          <select className="bg-transparent border-none focus:ring-0 w-full py-3 text-[10px] font-black text-muted tracking-widest cursor-pointer" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
             <option value="all" className="bg-card">ALL_MODULES</option>
             {[...new Set(masterCases.map(c => c.moduleName || c.module_name).filter(Boolean))].map((m: any) => <option key={m} value={m} className="bg-card">{m.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* TREE EXPLORER */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={Object.keys(tree)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 pb-40">
            {Object.entries(tree).map(([name, node]: [string, any]) => (
              <SortableFolder 
                key={name} 
                name={name} 
                node={node} 
                expandedModules={expandedModules} 
                onToggle={(path: string) => setExpandedModules(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path])} 
                onSave={handleSave} 
                onCancel={() => setEditingId(null)} 
                onDelete={handleDelete} 
                editingId={editingId} 
                setEditingId={setEditingId} 
                editForm={editForm} 
                setEditForm={setEditForm} 
                expandedId={expandedId} 
                setExpandedId={setExpandedId} 
                renderIndexedContent={renderIndexedContent} 
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {loading && <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const accents: any = { 
    indigo: 'border-t-indigo-500', 
    emerald: 'border-t-emerald-500', 
    amber: 'border-t-amber-500', 
    zinc: 'border-t-muted' 
  };
  return (
    <div className={cn("bg-card border border-border border-t-2 p-8 shadow-sm rounded-sm group hover:bg-muted/5 transition-all duration-300", accents[color])}>
      <div className="mb-4 text-muted group-hover:text-foreground transition-colors">{icon}</div>
      <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-foreground tracking-tighter font-mono">{value}</div>
    </div>
  );
}