import { LucideIcon } from 'lucide-react';

export default function StatCard({ 
  label, 
  value, 
  sub, 
  icon: Icon,
  trend
}: { 
  label: string, 
  value: string | number, 
  sub?: string,
  icon: LucideIcon,
  trend?: string
}) {
  return (
    <div className="glass rounded-2xl p-5 card-hover transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon size={16} className="text-white/70" />
        </div>
        {trend && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {trend}
          </span>
        )}
      </div>
      <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium">{label}</div>
      <div className="text-2xl font-semibold mt-1 tracking-tight">{value}</div>
      {sub && <div className="text-[12px] text-white/50 mt-1">{sub}</div>}
    </div>
  );
}
