'use client';
import React, { useEffect, useState, useMemo, Fragment } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  DndContext, closestCenter, PointerSensor, useSensor, useSensors 
} from '@dnd-kit/core';
import { 
  SortableContext, verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Edit3, Save, X, Loader2, CheckCircle2, AlertCircle, 
  Folder, Zap, ChevronDown, ChevronRight, Upload, 
  Hash, Type, Filter, Server, Command, 
  MousePointerClick, PlayCircle, Hourglass, Database,
  Box, FileJson, FileSpreadsheet, Target, FolderPlus, GripVertical,
  Trash2, RefreshCw
} from "lucide-react";
import { 
  getMasterTestCases, updateTestCase, uploadMasterTestCases, moveModule, deleteTestCase 
} from "@/lib/actions";
import { cn } from "@/lib/utils";

/* --- TREE BUILDER --- */
const buildTree = (cases: any[]) => {
  const tree: any = {};
  cases.forEach(tc => {
    const parts = (tc.moduleName || "UNGROUPED").split(" / ");
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

/* --- SORTABLE FOLDER COMPONENT --- */
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
        "group flex items-center justify-between px-6 py-3 bg-[#111114] border border-zinc-800 rounded-sm hover:bg-zinc-900 transition-all border-l-2",
        isExpanded ? "border-l-indigo-500 bg-zinc-900 shadow-lg" : "border-l-transparent"
      )}>
        <div className="flex items-center gap-4">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/5 rounded-sm">
            <GripVertical size={14} className="text-zinc-700" />
          </div>
          <div onClick={() => onToggle(node._path)} className="flex items-center gap-3 cursor-pointer select-none">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={16} className={cn(isExpanded ? "text-indigo-500 fill-indigo-500/10" : "text-zinc-600")} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-200">{name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
            <div className="flex items-center bg-black/40 border border-zinc-800 rounded-sm px-3 py-1 gap-4">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-emerald-500">{auto}</span>
                    <span className="text-[6px] text-zinc-600 font-black uppercase tracking-tighter mt-0.5">Auto</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-indigo-400">{manual}</span>
                    <span className="text-[6px] text-zinc-600 font-black uppercase tracking-tighter mt-0.5">Man</span>
                </div>
            </div>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-9 mt-2 border-l border-zinc-800/50 pl-4 space-y-2">
          {Object.entries(node).map(([key, value]: [string, any]) => {
            if (key.startsWith('_')) return null;
            return <SortableFolder key={key} name={key} node={value} {...{onToggle, expandedModules, expandedId, setExpandedId, onSave, onCancel, editingId, setEditingId, editForm, setEditForm, onDelete, renderIndexedContent}} />;
          })}
          
          {node._items.length > 0 && (
            <div className="bg-zinc-950/20 rounded-sm border border-zinc-800/50 divide-y divide-zinc-800/50 overflow-hidden">
               {node._items.map((tc: any) => (
                  <Fragment key={tc.id}>
                    <div 
                      onClick={() => !editingId && setExpandedId(expandedId === tc.id ? null : tc.id)} 
                      className={cn("p-4 hover:bg-white/[0.02] cursor-pointer flex items-center justify-between group/row transition-all", editingId === tc.id && "bg-indigo-500/5 border-y border-indigo-500/20")}
                    >
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                          {/* 1. Case Code Edit */}
                          <div className="w-24 shrink-0">
                            {editingId === tc.id ? (
                                <input 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-indigo-400 w-full outline-none font-mono text-[10px] focus:border-indigo-500" 
                                    value={editForm.caseCode} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, caseCode: e.target.value})} 
                                />
                            ) : (
                                <span className="text-[10px] font-mono text-indigo-400 font-bold">{tc.caseCode}</span>
                            )}
                          </div>

                          {/* 2. Title Edit */}
                          <div className="flex-1 min-w-0 pr-4">
                            {editingId === tc.id ? (
                                <input 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-1 text-xs text-white outline-none w-full focus:border-indigo-500" 
                                    value={editForm.title} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, title: e.target.value})} 
                                />
                            ) : (
                                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-tight truncate block">{tc.title}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          {/* 3. Mode Edit */}
                          <div className="w-24">
                            {editingId === tc.id ? (
                                <select 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-[9px] font-black uppercase outline-none w-full text-zinc-400" 
                                    value={editForm.mode} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, mode: e.target.value})}
                                >
                                    <option value="Automation">Automation</option>
                                    <option value="Manual">Manual</option>
                                </select>
                            ) : (
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{tc.mode}</span>
                            )}
                          </div>

                          {/* 4. Priority Edit */}
                          <div className="w-20">
                             {editingId === tc.id ? (
                                <select 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-[9px] font-black uppercase outline-none w-full text-zinc-400" 
                                    value={editForm.priority} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, priority: e.target.value})}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                             ) : (
                                <span className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 border rounded-sm block text-center", 
                                    tc.priority === 'critical' ? 'border-rose-500/30 text-rose-500 bg-rose-500/5' : 'border-zinc-800 text-zinc-600'
                                )}>{tc.priority}</span>
                             )}
                          </div>

                          <div className="flex items-center gap-2">
                             {editingId === tc.id ? (
                                <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-1.5 bg-emerald-600 text-white rounded-sm hover:bg-emerald-500"><Save size={12}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-sm"><X size={12}/></button>
                                </div>
                             ) : (
                                <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); setEditingId(tc.id); setEditForm({...tc}); setExpandedId(tc.id); }} className="p-1.5 text-zinc-700 hover:text-indigo-400 opacity-0 group-hover/row:opacity-100 transition-all"><Edit3 size={14}/></button>
                                  <button onClick={(e) => onDelete(e, tc.id)} className="p-1.5 text-zinc-700 hover:text-rose-500 opacity-0 group-hover/row:opacity-100 transition-all"><Trash2 size={14}/></button>
                                  <ChevronDown size={14} className={cn("text-zinc-800 transition-transform", expandedId === tc.id && "rotate-180 text-indigo-500")} />
                                </div>
                             )}
                          </div>
                        </div>
                    </div>

                    {/* Expandable Detail Panel */}
                    {expandedId === tc.id && (
                      <div className="p-10 bg-zinc-900/30 border-l-2 border-indigo-500/50 grid grid-cols-2 gap-10">
                          <div className="space-y-4">
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Command size={10}/> Instruction_Set</p>
                              {editingId === tc.id ? (
                                  <textarea 
                                    className="w-full bg-black border border-zinc-800 rounded-sm p-4 font-mono text-[11px] h-48 outline-none text-zinc-400 focus:border-indigo-500" 
                                    value={editForm.steps} 
                                    onChange={e => setEditForm({...editForm, steps: e.target.value})} 
                                  />
                              ) : (
                                  <div className="p-5 bg-zinc-950 rounded-sm border border-zinc-800 min-h-[12rem]">
                                    {renderIndexedContent(tc.steps, "text-indigo-500")}
                                  </div>
                              )}
                          </div>
                          <div className="space-y-4">
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Zap size={10}/> Expected_Outcome</p>
                              {editingId === tc.id ? (
                                  <textarea 
                                    className="w-full bg-black border border-zinc-800 rounded-sm p-4 font-mono text-[11px] h-48 outline-none text-zinc-400 focus:border-indigo-500" 
                                    value={editForm.expectedResult} 
                                    onChange={e => setEditForm({...editForm, expectedResult: e.target.value})} 
                                  />
                              ) : (
                                  <div className="p-5 bg-zinc-950 rounded-sm border border-zinc-800 min-h-[12rem]">
                                    {renderIndexedContent(tc.expectedResult, "text-emerald-500")}
                                  </div>
                              )}
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

/* --- MAIN COMPONENT --- */
export default function TestCaseManager() {
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });

  const loadData = async () => {
    const data = await getMasterTestCases();
    setMasterCases(data);
  };

  useEffect(() => { loadData(); }, []);

  const metrics = useMemo(() => {
    const total = masterCases.length;
    const automated = masterCases.filter(c => c.mode?.toLowerCase() === 'automation').length;
    const manual = masterCases.filter(c => c.mode?.toLowerCase() === 'manual').length;
    return { total, automated, manual, pending: total - (automated + manual), rate: total > 0 ? Math.round((automated/total)*100) : 0 };
  }, [masterCases]);

  const pieData = useMemo(() => [
    { name: 'AUTO', value: metrics.automated, color: '#10b981' },
    { name: 'MANUAL', value: metrics.manual, color: '#6366f1' },
    { name: 'BACKLOG', value: metrics.pending, color: '#3f3f46' },
  ].filter(d => d.value > 0), [metrics]);

  const tree = useMemo(() => buildTree(masterCases), [masterCases]);
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
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!newModuleName) return;
    setLoading(true);
    const placeholder = [{ 
        caseCode: `MOD-${Date.now().toString().slice(-4)}`, 
        title: "MODULE_INITIALIZER", 
        ModuleName: newModuleName, 
        Mode: "Manual", 
        Priority: "low" 
    }];
    const res = await uploadMasterTestCases(placeholder);
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

  const renderIndexedContent = (text: string, colorClass: string) => {
    if (!text) return <span className="opacity-20 font-mono text-[9px] uppercase tracking-widest">Data_Null</span>;
    return text.split('\n').filter(l => l.trim() !== '').map((line, idx) => (
      <div key={idx} className="flex gap-3 mb-1.5 border-b border-white/[0.02] pb-1.5 last:border-0 group/line">
        <span className={cn("shrink-0 font-mono text-[9px] mt-0.5 font-bold opacity-40 group-hover/line:opacity-100", colorClass)}>[{String(idx + 1).padStart(2, '0')}]</span>
        <span className="text-[11px] font-mono text-zinc-400 group-hover/line:text-zinc-200 transition-colors">{line}</span>
      </div>
    ));
  };

  return (
    <div className="p-8 space-y-8 bg-[#0c0c0e] h-screen overflow-y-auto custom-scrollbar text-zinc-300 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 mb-2 font-mono text-[10px] uppercase tracking-widest"><Server size={12} /> Registry / Infrastructure / Explorer</div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3"><Database size={28} className="text-indigo-500" />Requirement Registry</h1>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setIsAddingModule(!isAddingModule)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black px-4 py-3 rounded-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10"><FolderPlus size={14} /> New_Module</button>
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-sm font-mono text-lg font-bold">{masterCases.length} <span className="text-[10px] text-zinc-600 uppercase">Objects</span></div>
        </div>
      </header>

      {/* NEW MODULE INPUT */}
      {isAddingModule && (
        <div className="bg-[#111114] border border-indigo-500/30 p-6 rounded-sm flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <input autoFocus placeholder="NEW_PATH_IDENTIFIER..." className="bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-xs font-mono text-white flex-1 outline-none focus:border-indigo-500" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateModule()} />
            <button onClick={handleCreateModule} className="bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase rounded-sm">Create_Object</button>
            <button onClick={() => setIsAddingModule(false)} className="p-3 text-zinc-500 hover:text-white transition-colors"><X size={18}/></button>
        </div>
      )}

      {/* STATS & PIE */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Automation ROI" value={`${metrics.rate}%`} sub="Current Score" icon={<Target size={18}/>} color="emerald" />
            <StatCard title="Bot Ready" value={metrics.automated} sub="Scripted" icon={<PlayCircle size={18}/>} color="indigo" />
            <StatCard title="Manual_Ops" value={metrics.manual} sub="Human" icon={<MousePointerClick size={18}/>} color="amber" />
            <StatCard title="Registry" value={metrics.total} sub="Total" icon={<Box size={18}/>} color="zinc" />
        </div>
        <div className="bg-[#111114] border border-zinc-800 p-6 rounded-sm flex flex-col items-center justify-center relative overflow-hidden group min-h-[180px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800" />
            <div className="w-full h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={pieData} innerRadius={40} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none">{pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={0.8} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-mono font-bold text-white text-xl">{metrics.rate}%</div>
            </div>
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-2">Distribution</span>
        </div>
      </div>

      {loading && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}

      {/* TREE EXPLORER */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={Object.keys(tree)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
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
    </div>
  );
}

function StatCard({ title, value, sub, icon, color }: any) {
  const accents: any = { indigo: 'border-t-indigo-500', emerald: 'border-t-emerald-500', amber: 'border-t-amber-500', zinc: 'border-t-zinc-600' };
  return (
    <div className={cn("bg-[#111114] border border-zinc-800 border-t-2 p-8 shadow-sm rounded-sm group hover:bg-zinc-900/50 transition-all", accents[color])}>
      <div className="mb-4 text-zinc-500 group-hover:text-white transition-colors">{icon}</div>
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-white tracking-tighter font-mono">{value}</div>
      <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase tracking-widest">{sub}</p>
    </div>
  );
}