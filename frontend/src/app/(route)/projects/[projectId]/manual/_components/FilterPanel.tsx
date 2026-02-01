import { Hash, Type, Filter } from "lucide-react";

export function FilterPanel({ idFilter, setIdFilter, titleFilter, setTitleFilter, moduleFilter, setModuleFilter, masterCases }: any) {
  return (
    <div className="bg-card border border-border p-4 rounded-sm grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm uppercase">
      <div className="flex items-center px-4 gap-3 bg-background border border-border rounded-sm group focus-within:border-indigo-500 transition-colors">
        <Hash size={14} className="text-muted" />
        <input placeholder="ID_SEARCH..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-foreground" value={idFilter} onChange={e => setIdFilter(e.target.value)} />
      </div>
      <div className="flex items-center px-4 gap-3 bg-background border border-border rounded-sm group focus-within:border-indigo-500 transition-all">
        <Type size={14} className="text-muted" />
        <input placeholder="TITLE_MATCH..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-foreground" value={titleFilter} onChange={e => setTitleFilter(e.target.value)} />
      </div>
      <div className="flex items-center px-4 gap-3 bg-background border border-border rounded-sm group focus-within:border-indigo-500">
        <Filter size={14} className="text-muted" />
        <select className="bg-transparent border-none focus:ring-0 w-full py-3 text-[10px] font-black text-muted tracking-widest cursor-pointer" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          <option value="all">ALL_MODULES</option>
          {[...new Set(masterCases.map((c: any) => c.moduleName || c.module_name).filter(Boolean))].map((m: any) => (
            <option key={m} value={m}>{m.toUpperCase()}</option>
          ))}
        </select>
      </div>
    </div>
  );
}