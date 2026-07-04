import React from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Zap,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// A plain-language "malicious activity" flag. Styling deliberately reuses the
// app's existing risk-pill classes (text-[9px] uppercase font-mono, red/amber/
// green/zinc borders) so badges look native everywhere they appear. Only the
// umbrella MALICIOUS tag gets the bolder filled treatment — reserved for
// CRITICAL findings so it never becomes background noise.

export interface Tag {
  key: string;
  label: string;
}

const TAG_STYLE: Record<string, { cls: string; Icon: React.ComponentType<any> }> = {
  MALICIOUS:         { cls: 'bg-red-600 text-white border-red-700', Icon: ShieldAlert },
  CIRCULAR:          { cls: 'bg-red-50 text-red-700 border-red-200', Icon: RefreshCw },
  RAPID_PASSTHROUGH: { cls: 'bg-orange-50 text-orange-700 border-orange-200', Icon: Zap },
  ACCUMULATION:      { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: ArrowDownToLine },
  LAYERING:          { cls: 'bg-violet-50 text-violet-700 border-violet-200', Icon: Layers },
  STRUCTURING:       { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: TrendingDown },
  COLLECTOR:         { cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: ArrowDownToLine },
  DISTRIBUTOR:       { cls: 'bg-sky-50 text-sky-700 border-sky-200', Icon: ArrowUpFromLine },
  ANOMALY:           { cls: 'bg-zinc-100 text-zinc-700 border-zinc-300', Icon: Activity },
  SUSPICIOUS_TIMING: { cls: 'bg-zinc-100 text-zinc-700 border-zinc-300', Icon: Clock },
};

const FALLBACK = { cls: 'bg-zinc-100 text-zinc-600 border-zinc-200', Icon: AlertTriangle };

export function RiskBadge({ tag, size = 'sm' }: { tag: Tag; size?: 'sm' | 'xs' }) {
  const style = TAG_STYLE[tag.key] || FALLBACK;
  const Icon = style.Icon;
  const sz = size === 'xs' ? 'text-[8px] px-1 py-0.5' : 'text-[9px] px-1.5 py-0.5';
  const iconSz = size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  return (
    <span
      className={`inline-flex items-center gap-1 ${sz} font-bold font-mono uppercase tracking-wider rounded border ${style.cls}`}
      title={tag.label}
    >
      <Icon className={`${iconSz} shrink-0`} />
      <span className="truncate">{tag.label}</span>
    </span>
  );
}

export function RiskBadges({
  tags,
  max = 4,
  size = 'sm',
}: {
  tags?: Tag[] | null;
  max?: number;
  size?: 'sm' | 'xs';
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 items-center">
      {tags.slice(0, max).map((t, i) => (
        <RiskBadge key={`${t.key}-${i}`} tag={t} size={size} />
      ))}
    </span>
  );
}
