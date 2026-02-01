import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Folder, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { TestCaseRow } from "./TestCaseRow";

export function SortableFolder({ name, node, onToggle, expandedModules, ...props }: any) {
  const isExpanded = expandedModules.includes(node._path);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node._path });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn("mb-2", isDragging && "opacity-30")}>
      <div className={cn("group flex items-center justify-between px-6 py-3 bg-card border border-border rounded-sm hover:bg-muted/5 transition-all border-l-2", isExpanded ? "border-l-indigo-500 shadow-lg" : "border-l-transparent")}>
        <div className="flex items-center gap-4">
          <div {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-muted/10 rounded-sm">
            <GripVertical size={14} className="text-muted" />
          </div>
          <div onClick={() => onToggle(node._path)} className="flex items-center gap-3 cursor-pointer select-none">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={16} className={cn(isExpanded ? "text-indigo-500" : "text-muted")} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{name}</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-9 mt-2 border-l border-border pl-4 space-y-2">
          {Object.entries(node).map(([key, value]: [string, any]) => {
            if (key.startsWith('_')) return null;
            return <SortableFolder key={key} name={key} node={value} onToggle={onToggle} expandedModules={expandedModules} {...props} />;
          })}
          {node._items.length > 0 && (
            <div className="bg-card/30 rounded-sm border border-border overflow-hidden">
              {node._items.map((tc: any) => <TestCaseRow key={tc.id} tc={tc} {...props} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}