import { useState } from 'react';
import { ChevronDown, Check, ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp, ListFilter } from 'lucide-react';
import { usePhotoStore } from '../../store/usePhotoStore';

const sortOptions = [
  { id: 'date-desc', icon: CalendarArrowDown, label: '最新添加', hint: '按时间从新到旧' },
  { id: 'date-asc', icon: CalendarArrowUp, label: '最早添加', hint: '按时间从旧到新' },
  { id: 'name-asc', icon: ArrowDownAZ, label: '名称 A–Z', hint: '按名称升序' },
  { id: 'name-desc', icon: ArrowUpAZ, label: '名称 Z–A', hint: '按名称降序' },
] as const;

type SortId = typeof sortOptions[number]['id'];

interface SortControlProps {
  className?: string;
  compact?: boolean;
}

export default function SortControl({ className = '', compact = false }: SortControlProps) {
  const { sortOption, setSortOption } = usePhotoStore();
  const [open, setOpen] = useState(false);
  const active = sortOptions.find((option) => option.id === sortOption) ?? sortOptions[0];
  const Icon = active.icon;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={`inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-left text-white/75 transition hover:border-cyber-blue/35 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-cyber-blue/25 ${compact ? 'h-8 px-2.5 text-[11px]' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`排序：${active.label}`}
      >
        <ListFilter size={compact ? 14 : 16} className="text-cyber-blue" />
        {!compact && <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">排序</span>}
        <Icon size={compact ? 14 : 15} className="text-white/60" />
        <span className="max-w-[78px] truncate text-xs font-medium text-white/85">{active.label}</span>
        <ChevronDown size={14} className={`ml-auto text-white/35 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-[80] w-56 overflow-hidden rounded-2xl border border-white/12 bg-[#101722]/[.98] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">排列方式</div>
          {sortOptions.map((option) => {
            const OptionIcon = option.icon;
            const selected = sortOption === option.id;
            return (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                key={option.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { setSortOption(option.id as SortId); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-cyber-blue/12 text-cyber-blue' : 'text-white/65 hover:bg-white/[.07] hover:text-white'}`}
              >
                <OptionIcon size={16} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] text-white/35">{option.hint}</span>
                </span>
                {selected && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
