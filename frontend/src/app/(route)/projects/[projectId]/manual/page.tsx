'use client';

import React, { useEffect, useState, useMemo } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Loader2, Database, Target, MousePointerClick, PlayCircle, Box, FolderPlus, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";

import {
  getTestCasesByProject,
  updateTestCase,
  moveModule,
  deleteTestCase,
  uploadMasterTestCases,
} from "@/lib/actions";

import { StatCard } from "./_components/StatCard";
import { DistributionPie } from "./_components/DistributionPie";
import { FilterPanel } from "./_components/FilterPanel";
import { SortableFolder } from "./_components/SortableFolder";
import { ImportTestCaseTool } from "./_components/ImportTestCaseTool";
import { cn } from "@/lib/utils";

/* ---------------- ✅ HELPER COMPONENT (FIX) ---------------- */
const RenderIndexedContent = ({ text, colorClass }: { text: string; colorClass: string }) => {
  if (!text) return <span className="opacity-20 font-mono text-[9px] uppercase tracking-widest italic leading-none">Data_Null</span>;
  return (
    <div className="space-y-1.5">
      {text.split('\n').filter(l => l.trim() !== '').map((line, idx) => (
        <div key={idx} className="flex gap-3 group/line">
          <span className={cn("shrink-0 font-mono text-[9px] mt-0.5 font-bold opacity-40", colorClass)}>
            [{String(idx + 1).padStart(2, '0')}]
          </span>
          <span className="text-[11px] font-mono text-muted leading-relaxed">{line}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------------- TREE BUILDER ---------------- */
const buildTree = (cases: any[]) => {
  const tree: any = {};
  cases.forEach(tc => {
    const rawModule = tc.moduleName || tc.module_name || "UNGROUPED";
    const parts = rawModule.split(" / ");
    let current = tree;

    parts.forEach((part: string, idx: number) => {
      if (!current[part]) {
        current[part] = {
          _items: [],
          _path: parts.slice(0, idx + 1).join(" / "),
        };
      }
      if (idx === parts.length - 1) {
        current[part]._items.push(tc);
      }
      current = current[part];
    });
  });
  return tree;
};

/* ---------------- MAIN COMPONENT ---------------- */
export default function TestCaseManager() {
  const { projectId } = useParams();
  const { theme } = useTheme();

  /* ---------- STATE ---------- */
  const [mounted, setMounted] = useState(false);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const [idFilter, setIdFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");

  /* ---------- DATA ---------- */
  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    const data = await getTestCasesByProject(Number(projectId));
    setMasterCases(data);
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [projectId]);

  /* ---------- MEMOS ---------- */
  const filteredCases = useMemo(() => {
    return masterCases.filter(tc => {
      const matchId = !idFilter || tc.caseCode?.toLowerCase().includes(idFilter.toLowerCase());
      const matchTitle = !titleFilter || tc.title?.toLowerCase().includes(titleFilter.toLowerCase());
      const matchModule = moduleFilter === "all" || tc.moduleName === moduleFilter;
      return matchId && matchTitle && matchModule;
    });
  }, [masterCases, idFilter, titleFilter, moduleFilter]);

  const tree = useMemo(() => buildTree(filteredCases), [filteredCases]);

  const metrics = useMemo(() => {
    const total = masterCases.length;
    const automated = masterCases.filter(c => c.mode?.toLowerCase() === "automation").length;
    const manual = masterCases.filter(c => c.mode?.toLowerCase() === "manual").length;
    return {
      total,
      automated,
      manual,
      rate: total ? Math.round((automated / total) * 100) : 0,
    };
  }, [masterCases]);

  /* ---------- DND ---------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sourcePath = active.id;
    const targetPath = over.id;
    const newPath = `${targetPath} / ${sourcePath.split(" / ").pop()}`;

    if (confirm(`MOVE "${sourcePath}" → "${targetPath}" ?`)) {
      setLoading(true);
      await moveModule(sourcePath, newPath);
      await loadData();
      setLoading(false);
    }
  };

  /* ---------- CRUD ---------- */
  const handleSave = async () => {
    if (!editingId) return;
    setLoading(true);
    await updateTestCase(editingId, editForm);
    setEditingId(null);
    await loadData();
    setLoading(false);
  };

  const handleDelete = async (e: any, id: number) => {
    e.stopPropagation();
    if (!confirm("DELETE TEST CASE?")) return;
    setLoading(true);
    await deleteTestCase(id);
    await loadData();
    setLoading(false);
  };

  const handleCreateModule = async () => {
    if (!newModuleName.trim() || !projectId) return;
    setLoading(true);
    await uploadMasterTestCases(
      [
        {
          projectId: Number(projectId),
          caseCode: `MOD-${Date.now().toString().slice(-5)}`,
          title: "MODULE_INITIALIZER",
          moduleName: newModuleName.trim(),
          module_name: newModuleName.trim(),
          "Module Name": newModuleName.trim(),
          ModuleName: newModuleName.trim(),
          mode: "Manual",
          priority: "low",
        },
      ],
      Number(projectId)
    );
    setNewModuleName("");
    setIsAddingModule(false);
    await loadData();
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="p-8 space-y-8 bg-background text-foreground h-screen overflow-y-auto font-mono selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="flex justify-between items-center border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <Database className="text-indigo-500" size={28} />
          <h1 className="text-3xl font-bold uppercase tracking-tighter leading-none">Requirement Tree</h1>
        </div>

        <div className="flex gap-3 items-center">
          <ImportTestCaseTool projectId={Number(projectId)} onRefresh={loadData} />
          <button
            onClick={() => setIsAddingModule(!isAddingModule)}
            className="bg-indigo-600 text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-sm hover:opacity-90 transition-all flex items-center gap-2"
          >
            {isAddingModule ? <X size={14}/> : <FolderPlus size={14} />}
            {isAddingModule ? 'Abort' : 'New_Module'}
          </button>
        </div>
      </header>

      {/* NEW MODULE INPUT */}
      {isAddingModule && (
        <div className="flex gap-3 items-center bg-card border border-border p-4 rounded-sm animate-in fade-in zoom-in-95 duration-200">
          <input
            autoFocus
            value={newModuleName}
            onChange={e => setNewModuleName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateModule()}
            placeholder="MODULE / SUBMODULE PATH (e.g. Settings / Security)"
            className="flex-1 bg-background border border-border px-4 py-2 text-xs font-mono outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleCreateModule}
            className="bg-indigo-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest"
          >
            Create_Object
          </button>
        </div>
      )}

      {/* STATS + PIE (FIXED HEIGHT) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch">
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Automation ROI" value={`${metrics.rate}%`} icon={<Target size={18} />} color="emerald" className="h-full" />
          <StatCard title="Bot Ready" value={metrics.automated} icon={<PlayCircle size={18} />} color="indigo" className="h-full" />
          <StatCard title="Manual Ops" value={metrics.manual} icon={<MousePointerClick size={18} />} color="amber" className="h-full" />
          <StatCard title="Registry" value={metrics.total} icon={<Box size={18} />} color="emerald" className="h-full" />
        </div>
        <div className="h-full">
          <DistributionPie metrics={metrics} isDark={theme === "dark"} />
        </div>
      </div>

      {/* FILTER */}
      <FilterPanel
        idFilter={idFilter}
        setIdFilter={setIdFilter}
        titleFilter={titleFilter}
        setTitleFilter={setTitleFilter}
        moduleFilter={moduleFilter}
        setModuleFilter={setModuleFilter}
        masterCases={masterCases}
      />

      {/* TREE EXPLORER */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={Object.keys(tree)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 pb-40">
            {Object.entries(tree).map(([name, node]: any) => (
              <SortableFolder
                key={name}
                name={name}
                node={node}
                expandedModules={expandedModules}
                onToggle={(path: string) =>
                  setExpandedModules(p =>
                    p.includes(path) ? p.filter(x => x !== path) : [...p, path]
                  )
                }
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                editingId={editingId}
                setEditingId={setEditingId}
                editForm={editForm}
                setEditForm={setEditForm}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
                onDelete={handleDelete}
                // ✅ PASSING THE FIXED RENDER COMPONENT
                renderIndexedContent={(text: string, color: string) => <RenderIndexedContent text={text} colorClass={color} />}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {loading && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      )}
    </div>
  );
}