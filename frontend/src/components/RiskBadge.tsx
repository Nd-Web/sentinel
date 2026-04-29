import { cn } from '@/lib/utils'
import type { ThreatLevel } from '@/services/scan.service'

const styles: Record<ThreatLevel, string> = {
  HIGH: 'bg-red-500/15 text-red-400 border-red-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  LOW: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  CLEAN: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}

export function RiskBadge({ level, className }: { level: ThreatLevel; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold tracking-wide',
        styles[level],
        className,
      )}
    >
      {level}
    </span>
  )
}

export function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  let bar = 'bg-emerald-500'
  if (clamped >= 80) bar = 'bg-red-500'
  else if (clamped >= 50) bar = 'bg-amber-500'
  else if (clamped >= 20) bar = 'bg-yellow-500'

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-[11px] text-slate-400 font-mono w-10 text-right">
        {clamped.toFixed(0)}
      </span>
    </div>
  )
}
