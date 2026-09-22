"use client";
import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { Users, MessageSquare, Inbox, Clock, Sparkles, ArrowRight, Copy, Check, Send, AlertCircle, Link2, Shield } from 'lucide-react';
import Link from 'next/link';

interface Draft {
  id: string;
  draft_text: string;
  purpose: string;
  status: string;
  created_at: string;
  contacts?: { full_name: string; headline: string; profile_url?: string };
}

interface LinkedInStatus {
  connected: boolean;
  status: string;
  message: string;
  profile?: { name: string; email: string; picture: string };
  scopes?: string[];
  expires_in_days?: number | null;
  is_expired?: boolean;
  oauth_configured: boolean;
  redirect_uri: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({ contacts: 0, drafts: 0, pending: 0, followups: 0, approved: 0, sent: 0, interactions: 0 });
  const [recentDrafts, setRecentDrafts] = useState<Draft[]>([]);
  const [briefing, setBriefing] = useState<any>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInStatus | null>(null);

  useEffect(() => {
    fetchStats();
    fetchRecentDrafts();
    fetchLinkedInStatus();
  }, []);

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/stats?user_id=philip');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }

  async function fetchRecentDrafts() {
    try {
      const res = await fetch('/api/drafts?user_id=philip&status=pending');
      const data = await res.json();
      setRecentDrafts((data.drafts || []).slice(0, 4));
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchLinkedInStatus() {
    try {
      const res = await fetch('/api/auth/linkedin/status');
      const data = await res.json();
      setLinkedinStatus(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function generateBriefing() {
    setLoadingBriefing(true);
    try {
      const res = await fetch('/api/agent/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'philip', timezone: 'Africa/Lagos' })
      });
      const data = await res.json();
      setBriefing(data.briefing);
      fetchStats();
      fetchRecentDrafts();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBriefing(false);
    }
  }

  function copyDraft(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Good morning, Philip</h1>
          <p className="text-[14px] text-white/50 mt-1">
            Your personal relationship assistant • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • Africa/Lagos • 
            <span className={`ml-2 ${linkedinStatus?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {linkedinStatus?.connected ? `● Connected as ${linkedinStatus.profile?.name}` : '○ Not connected'}
            </span>
          </p>
        </div>
        <button
          onClick={generateBriefing}
          disabled={loadingBriefing}
          className="px-4 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium flex items-center gap-2 hover:bg-white/90 transition disabled:opacity-50"
        >
          <Sparkles size={14} />
          {loadingBriefing ? 'Generating...' : 'Generate Briefing'}
        </button>
      </div>

      {/* LinkedIn Connection Status Card */}
      <div className={`glass rounded-[20px] p-5 border ${linkedinStatus?.connected ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-amber-500/20 bg-amber-500/[0.03]'}`}>
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${linkedinStatus?.connected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
              <Link2 size={16} className={linkedinStatus?.connected ? 'text-emerald-400' : 'text-amber-400'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-medium">LinkedIn Connection</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${linkedinStatus?.connected ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                  {linkedinStatus?.status || 'checking...'}
                </span>
              </div>
              <p className="text-[12px] text-white/50 mt-1">
                {linkedinStatus?.message || 'Checking connection status...'}
                {linkedinStatus?.connected && linkedinStatus?.expires_in_days !== null && ` • Expires in ${linkedinStatus.expires_in_days} days`}
              </p>
              {linkedinStatus?.profile?.email && (
                <p className="text-[11px] text-white/30 mt-1">{linkedinStatus.profile.email} • Scopes: {linkedinStatus.scopes?.join(', ')}</p>
              )}
              {!linkedinStatus?.oauth_configured && (
                <p className="text-[11px] text-amber-300/70 mt-2 flex items-center gap-1.5">
                  <AlertCircle size={12} /> OAuth not configured — set LINKEDIN_CLIENT_ID in Vercel env vars. See docs/OAUTH_SETUP.md
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {linkedinStatus?.connected ? (
              <Link href="/settings" className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] hover:bg-white/10">
                Manage
              </Link>
            ) : (
              <a href="/api/auth/linkedin?redirect=true" className="px-4 py-2 rounded-xl bg-[#0A66C2] text-white text-[12px] font-medium hover:bg-[#0958a8] flex items-center gap-2">
                <span className="w-4 h-4 bg-white rounded flex items-center justify-center text-[#0A66C2] font-bold text-[10px]">in</span>
                Connect LinkedIn
              </a>
            )}
          </div>
        </div>

        {!linkedinStatus?.connected && (
          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[11px] font-medium text-white/70 mb-1.5 flex items-center gap-1.5"><Shield size={12} /> How to connect:</p>
            <ol className="text-[11px] text-white/40 leading-relaxed list-decimal list-inside space-y-1">
              <li>Create LinkedIn Developer App at developer.linkedin.com (see docs/OAUTH_SETUP.md)</li>
              <li>Add product: <strong>Sign In with LinkedIn using OpenID Connect</strong> (auto-approved)</li>
              <li>Add redirect URI: <code className="px-1 py-0.5 rounded bg-white/10">{linkedinStatus?.redirect_uri || 'https://personal-linkedin-agent.vercel.app/api/auth/linkedin/callback'}</code></li>
              <li>Copy Client ID & Secret to Vercel env vars, redeploy, then click Connect</li>
              <li>Real capabilities: OAuth login + lite profile (name, photo, email) — connections/messages require partner approval (closed), so app uses manual intake fallback (compliant)</li>
            </ol>
          </div>
        )}
      </div>

      {/* Stats - Real from Supabase */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Contacts" value={loadingStats ? '...' : stats.contacts} sub="Real from Supabase" icon={Users} trend={stats.contacts > 0 ? `${stats.contacts} in DB` : 'Add contacts via Intake'} />
        <StatCard label="Pending Drafts" value={loadingStats ? '...' : stats.pending} sub="Needs your approval" icon={Inbox} />
        <StatCard label="Total Drafts" value={loadingStats ? '...' : stats.drafts} sub={`${stats.approved} approved, ${stats.sent} sent`} icon={MessageSquare} />
        <StatCard label="Follow-ups" value={loadingStats ? '...' : stats.followups} sub={`${stats.interactions} interactions total`} icon={Clock} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Morning Briefing Card */}
        <div className="col-span-2 glass rounded-[20px] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">☀️</div>
              <div>
                <h2 className="text-[15px] font-semibold">Morning Briefing</h2>
                <p className="text-[11px] text-white/40">08:00 Africa/Lagos • Daily • Real data from Supabase</p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">MIXED AUTONOMY</span>
          </div>

          {briefing ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[13px] text-white/80 leading-relaxed">{briefing.summary}</p>
                <p className="text-[11px] text-white/30 mt-2">{briefing.contacts_reviewed} contacts reviewed • {new Date(briefing.generated_at).toLocaleTimeString()} • {briefing.timezone}</p>
              </div>
              {briefing.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-white/[0.04] border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{item.reason}</span>
                    <span className="text-[11px] text-white/40">→ {item.contact_id.slice(0,8)}</span>
                  </div>
                  <p className="text-[13px] text-white/70 leading-relaxed">{item.draft}</p>
                  <p className="text-[11px] text-white/30 mt-2">{item.context_summary}</p>
                </div>
              ))}
              {briefing.items?.length === 0 && (
                <p className="text-[12px] text-white/40 text-center py-4">No contacts need attention today. Add more via /intake or /contacts.</p>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">🌅</div>
              <p className="text-[13px] text-white/60">No briefing generated yet today</p>
              <p className="text-[11px] text-white/30 mt-1 max-w-[320px] mx-auto">Generate briefing from real Supabase contacts. Uses actual saved context, not demo data.</p>
              <button onClick={generateBriefing} className="mt-4 text-[12px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition">
                Generate now →
              </button>
            </div>
          )}
        </div>

        {/* Capability Matrix */}
        <div className="glass rounded-[20px] p-6">
          <h3 className="text-[13px] font-semibold mb-4">Capability Matrix (Real vs Blocked)</h3>
          <div className="space-y-3 text-[11px]">
            <div>
              <div className="text-emerald-300 font-medium flex items-center gap-1.5">✅ Real (Self-Serve)</div>
              <ul className="text-white/40 mt-1 space-y-0.5 list-disc list-inside">
                <li>OAuth login via OIDC</li>
                <li>Lite profile (name, photo, email)</li>
                <li>Post as member (w_member_social)</li>
              </ul>
            </div>
            <div>
              <div className="text-amber-300 font-medium flex items-center gap-1.5">⚠️ Requires Approval</div>
              <ul className="text-white/40 mt-1 space-y-0.5 list-disc list-inside">
                <li>Connections count (MDP)</li>
                <li>DM sending (partner + no automation)</li>
              </ul>
            </div>
            <div>
              <div className="text-red-300 font-medium flex items-center gap-1.5">❌ Closed</div>
              <ul className="text-white/40 mt-1 space-y-0.5 list-disc list-inside">
                <li>Full connections list</li>
                <li>Read inbox / webhooks</li>
                <li>Real-time detection</li>
              </ul>
            </div>
            <div>
              <div className="text-blue-300 font-medium">🔧 Fallback (Compliant)</div>
              <ul className="text-white/40 mt-1 space-y-0.5 list-disc list-inside">
                <li>Manual intake forms</li>
                <li>Approval-required manual send</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[10px] text-white/30 leading-relaxed">
              Official sources verified 2026-09-22. See docs/API_CAPABILITY_MATRIX.md for full matrix with doc URLs, scopes, rate limits.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approval Inbox Preview - Real from Supabase */}
      <div className="glass rounded-[20px] p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold">Approval Inbox (Real)</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-black font-medium">{recentDrafts.length} pending from DB</span>
          </div>
          <Link href="/drafts" className="text-[12px] text-white/50 hover:text-white flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recentDrafts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-white/50">No pending drafts in database</p>
            <p className="text-[11px] text-white/30 mt-1">Add contacts via /intake → Generate welcome → Drafts appear here. No demo data.</p>
            <Link href="/intake" className="mt-3 inline-block text-[12px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
              Go to Intake →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recentDrafts.map(draft => (
              <div key={draft.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[11px] font-bold">
                      {draft.contacts?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2) || '??'}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium leading-none">{draft.contacts?.full_name || 'Unknown'}</div>
                      <div className="text-[11px] text-white/40 mt-1">{draft.contacts?.headline || draft.purpose}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {draft.purpose}
                  </span>
                </div>
                <p className="text-[13px] text-white/70 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/[0.03]">
                  {draft.draft_text}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => copyDraft(draft.draft_text, draft.id)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center justify-center gap-1.5 hover:bg-white/10 transition"
                  >
                    {copiedId === draft.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === draft.id ? 'Copied!' : 'Copy draft'}
                  </button>
                  {draft.contacts?.profile_url ? (
                    <a href={draft.contacts.profile_url} target="_blank" className="px-3 py-2 rounded-xl bg-white text-black text-[12px] flex items-center gap-1.5 font-medium hover:bg-white/90">
                      <Send size={12} /> Open LinkedIn
                    </a>
                  ) : (
                    <Link href="/drafts" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px]">View</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflows */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'Morning Briefing', desc: '8:00 AM daily review — uses real Supabase contacts, Vercel Cron + n8n', status: 'Live', color: 'emerald' },
          { title: 'New Connection Welcome', desc: 'Manual intake fallback (real-time unavailable per official docs)', status: 'Fallback Live', color: 'blue' },
          { title: 'Reply Assistant', desc: 'Manual intake + classification + policy gate + approval required', status: 'Live', color: 'violet' },
        ].map(w => (
          <div key={w.title} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-medium">{w.title}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                w.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                w.color === 'blue' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                'bg-violet-500/10 text-violet-300 border-violet-500/20'
              }`}>{w.status}</span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed">{w.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
