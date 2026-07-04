import React from 'react';
import { X } from 'lucide-react';

// Reusable ₹ Min–Max amount filter. Styled to match the app's existing inline
// controls (white card, border-[#E4E4E7], font-mono labels) so it looks native
// on every page. Empty min/max means "unbounded" on that side.

export interface AmountRange {
  min: number | null;
  max: number | null;
}

export const EMPTY_RANGE: AmountRange = { min: null, max: null };

export function inAmountRange(amount: number | null | undefined, range: AmountRange): boolean {
  const a = Number(amount) || 0;
  if (range.min != null && a < range.min) return false;
  if (range.max != null && a > range.max) return false;
  return true;
}

export function AmountRangeFilter({
  value,
  onChange,
  label = 'Amount ₹',
}: {
  value: AmountRange;
  onChange: (r: AmountRange) => void;
  label?: string;
}) {
  const active = value.min != null || value.max != null;
  const num = (s: string) => (s === '' ? null : Number(s));
  return (
    <div className="flex items-center gap-1.5 bg-white border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 shadow-xs">
      <span className="text-[10px] uppercase font-bold text-[#71717A] font-mono pr-2 border-r border-[#E4E4E7]">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Min"
        value={value.min ?? ''}
        onChange={(e) => onChange({ ...value, min: num(e.target.value) })}
        className="w-16 bg-transparent text-xs font-mono text-zinc-900 focus:outline-none placeholder-zinc-400"
      />
      <span className="text-zinc-400 text-xs">–</span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Max"
        value={value.max ?? ''}
        onChange={(e) => onChange({ ...value, max: num(e.target.value) })}
        className="w-16 bg-transparent text-xs font-mono text-zinc-900 focus:outline-none placeholder-zinc-400"
      />
      {active && (
        <button
          type="button"
          onClick={() => onChange({ min: null, max: null })}
          className="text-zinc-400 hover:text-red-600 cursor-pointer"
          title="Clear amount filter"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
