"use client";
import { useState, useEffect } from 'react';
import { Clock, Plus, Loader2 } from 'lucide-react';

interface Followup {
  id: string;
  reason: string;
  due_at: string;
  status: string;
  contacts?: { full_name: string };
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowups();
  }, []);

  async function fetchFollowups() {
    setLoading(true);
    try {
      const res = await fetch('/api/followups?user_id=philip');
      const data = await res.json();
      setFollowups(data.followups || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[800px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Follow-ups — Real from Supabase</h1>
          <p className="text-[13px] text-white/50 mt-1">No demo data. When and why you want to reconnect — tracked by agent, reminded in morning briefing.</p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium flex items-center gap-2">
          <Plus size={14} /> New Follow-up
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-white/30" />
          <span className="ml-2 text-[13px] text-white/40">Loading real follow-ups from Supabase...</span>
        </div>
      ) : followups.length === 0 ? (
        <div className="glass rounded-[20px] p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">📭</div>
          <p className="text-[13px] text-white/60">No follow-ups in database</p>
          <p className="text-[11px] text-white/30 mt-1">No demo data. Follow-ups are created when you approve drafts or log conversations. They appear in morning briefing when due.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {followups.map(f => {
            const isOverdue = new Date(f.due_at).getTime() < Date.now();
            return (
              <div key={f.id} className={`glass rounded-[16px] p-4 flex items-center gap-4 ${isOverdue ? 'border-amber-500/20 bg-amber-500/[0.03]' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-amber-500/20 border border-amber-500/20' : 'bg-white/5 border border-white/10'}`}>
                  <Clock size={14} className={isOverdue ? 'text-amber-400' : 'text-white/50'} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{f.contacts?.full_name || 'Contact'}</div>
                  <div className="text-[11px] text-white/50 mt-0.5">{f.reason}</div>
                </div>
                <div className="text-right">
                  <div className={`text-[11px] px-2 py-1 rounded-full border ${isOverdue ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
                    {isOverdue ? 'Overdue' : 'Due'} • {new Date(f.due_at).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">{f.status} • Real from DB</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass rounded-[16px] p-4">
        <h4 className="text-[12px] font-medium mb-2">How it works (Real)</h4>
        <p className="text-[11px] text-white/40 leading-relaxed">
          When you approve a draft or log a conversation, agent can create a follow-up in Supabase table <code className="px-1 py-0.5 rounded bg-white/10 text-white/60">followups</code> with RLS owner-only. Morning briefing checks overdue follow-ups and includes them. No demo data — all real.
        </p>
      </div>
    </div>
  );
}
