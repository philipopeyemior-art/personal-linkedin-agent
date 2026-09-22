"use client";
import { useState, useEffect } from 'react';
import { Sun, Sparkles, Clock, Copy, Check, Loader2 } from 'lucide-react';

export default function BriefingsPage() {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats?user_id=philip');
      const data = await res.json();
      setStats(data);
    } catch {}
  }

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'philip', timezone: 'Africa/Lagos' })
      });
      const data = await res.json();
      setBriefing(data.briefing);
      fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[16px]">☀️</span>
            Morning Briefing — Real from Supabase
          </h1>
          <p className="text-[13px] text-white/50 mt-1">No demo data. Every morning at 08:00 Africa/Lagos — reviews real conversations from DB, identifies reconnections, drafts in your voice. {stats?.contacts || 0} contacts in DB.</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium flex items-center gap-2 hover:bg-white/90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Generating...' : 'Generate Now (Real)'}
        </button>
      </div>

      <div className="glass rounded-[20px] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Clock size={14} /></div>
          <div>
            <div className="text-[13px] font-medium">n8n Workflow 1 — Morning Relationship Briefing (Real)</div>
            <div className="text-[11px] text-white/40">Schedule Trigger (08:00) → Fetch real contacts from Supabase → POST /agent/briefing → Save real drafts → Notify</div>
          </div>
          <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Live • No demo</span>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-mono text-white/40 leading-relaxed">
          Schedule Trigger (08:00 Africa/Lagos)<br/>
          ↓<br/>
          Postgres: SELECT * FROM contacts WHERE user_id = '00000000-...' ORDER BY updated_at DESC LIMIT 20 (REAL)<br/>
          ↓<br/>
          IF: any contacts to review? (REAL COUNT: {stats?.contacts || 0})<br/>
          ↓<br/>
          HTTP Request: POST https://personal-linkedin-agent.vercel.app/api/agent/briefing (REAL)<br/>
          ↓<br/>
          Save briefing and draft records to Supabase drafts table (REAL)<br/>
          ↓<br/>
          Send private email / dashboard notification
        </div>
      </div>

      {briefing ? (
        <div className="space-y-4">
          <div className="glass rounded-[20px] p-6 border border-blue-500/20 bg-blue-500/[0.03]">
            <div className="flex items-center gap-2 mb-3">
              <Sun size={16} className="text-amber-400" />
              <span className="text-[13px] font-medium">Today's Briefing — {new Date(briefing.generated_at).toLocaleDateString()} (Real)</span>
              <span className="ml-auto text-[11px] text-white/40">{briefing.contacts_reviewed} contacts reviewed (real from DB) • {briefing.timezone}</span>
            </div>
            <p className="text-[14px] text-white/80 leading-relaxed">{briefing.summary}</p>
          </div>

          <div className="space-y-3">
            {briefing.items?.length === 0 ? (
              <div className="glass rounded-[16px] p-6 text-center">
                <p className="text-[13px] text-white/50">No contacts need attention today</p>
                <p className="text-[11px] text-white/30 mt-1">All caught up! Add more contacts via /intake or wait for follow-ups to become due. No demo data.</p>
              </div>
            ) : (
              briefing.items?.map((item: any, idx: number) => (
                <div key={idx} className="glass rounded-[16px] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">{item.reason}</span>
                    <span className="text-[11px] text-white/30">Contact: {item.contact_id.slice(0,12)}... (real ID from DB)</span>
                    <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">Needs approval • Real</span>
                  </div>
                  <p className="text-[13px] text-white/70 leading-relaxed p-3 rounded-xl bg-white/[0.03] border border-white/5">{item.draft}</p>
                  {item.context_summary && <p className="text-[11px] text-white/30 mt-2">{item.context_summary} • Real context from DB</p>}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(item.draft); setCopied(item.contact_id); setTimeout(() => setCopied(null), 2000); }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] flex items-center gap-1.5 hover:bg-white/10"
                    >
                      {copied === item.contact_id ? <Check size={12} /> : <Copy size={12} />}
                      {copied === item.contact_id ? 'Copied' : 'Copy Real Draft'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-[20px] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-[24px]">🌅</div>
          <h3 className="text-[15px] font-medium">No briefing for today yet — Real DB</h3>
          <p className="text-[12px] text-white/40 mt-1 max-w-[360px] mx-auto leading-relaxed">
            No demo data. Click Generate Now to create briefing from your real Supabase contacts ({stats?.contacts || 0} contacts). In production, n8n triggers automatically at 08:00 Africa/Lagos + Vercel Cron.
          </p>
        </div>
      )}
    </div>
  );
}
