import { Sparkles, AlertTriangle, Clock, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { useStats } from '../hooks/useStats';

export function ProductivityDashboard() {
  const { stats, loading } = useStats();

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  const totalRuns = stats?.totalRuns ?? 0;
  const fallbackCount = stats?.fallbackCount ?? 0;
  const timeSavedMinutes = stats?.timeSavedMinutes ?? 0;
  const fallbackRate = totalRuns > 0 ? Math.round((fallbackCount / totalRuns) * 100) : 0;
  const hours = Math.floor(timeSavedMinutes / 60);
  const minutes = timeSavedMinutes % 60;

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <div className="text-center pb-2">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-3">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Productivity</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          How Prompt Enhancer is helping you work faster.
        </p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
          <TrendingUp size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">Lifetime Stats</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Sparkles size={14} className="text-emerald-500" />}
            label="Total Runs"
            value={totalRuns.toLocaleString()}
            accent="emerald"
            sub={totalRuns === 0 ? 'No enhancements yet' : 'Enhancements completed'}
          />
          <StatCard
            icon={<Clock size={14} className="text-indigo-500" />}
            label="Time Saved"
            value={timeSavedMinutes === 0 ? '0m' : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
            accent="indigo"
            sub="Estimated"
          />
          <StatCard
            icon={<AlertTriangle size={14} className="text-amber-500" />}
            label="Fallbacks"
            value={fallbackCount.toLocaleString()}
            accent="amber"
            sub={totalRuns > 0 ? `${fallbackRate}% of runs` : 'No fallbacks'}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
          <Clock size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">What This Means</h2>
        </div>

        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Time Saved</span> is estimated at ~90 seconds per enhancement &mdash; the rough time you&rsquo;d spend rewriting a rough prompt into something usable.
          </p>
          <p>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Fallbacks</span> count the times the local model was unavailable and Prompt Enhancer degraded gracefully (e.g. rule-based cleanup).
          </p>
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: 'emerald' | 'indigo' | 'amber';
}

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  const dotColor = {
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
  }[accent];

  return (
    <div className="flex flex-col gap-2 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/30">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        {icon}
        <span>{sub}</span>
      </div>
    </div>
  );
}
