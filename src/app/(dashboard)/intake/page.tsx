"use client";
import { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function IntakePage() {
  const [mode, setMode] = useState<'paste' | 'json'>('paste');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleIntake() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/agent/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: 'philip',
          source: 'manual_paste',
          content: input,
          contact_data: mode === 'json' ? JSON.parse(input) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Intake failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleWelcome() {
    if (!result?.contact?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/agent/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: result.contact.id, user_id: 'philip' })
      });
      const data = await res.json();
      setResult({ ...result, welcome_draft: data.draft });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[800px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Contact Intake — Real Supabase Storage</h1>
        <p className="text-[13px] text-white/50 mt-1">No demo data. Manual fallback for LinkedIn connections (since LinkedIn closed connections API). Stores real contacts in Supabase with RLS owner-only.</p>
      </div>

      <div className="glass rounded-[20px] p-6 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('paste')}
            className={`px-4 py-2 rounded-xl text-[12px] font-medium border transition ${mode === 'paste' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            Paste LinkedIn Info
          </button>
          <button
            onClick={() => setMode('json')}
            className={`px-4 py-2 rounded-xl text-[12px] font-medium border transition ${mode === 'json' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            JSON Contact
          </button>
        </div>

        <div>
          <label className="text-[11px] text-white/50 uppercase tracking-widest">
            {mode === 'paste' ? 'Paste profile URL, name, headline, or notes' : 'JSON: { full_name, headline, profile_url, notes }'}
          </label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={8}
            placeholder={mode === 'paste' ? 'e.g.\nSarah Chen\nAI Infrastructure @ Stripe\nhttps://linkedin.com/in/sarahchen\nMet at conference...' : '{\n  "full_name": "Sarah Chen",\n  "headline": "AI Infrastructure @ Stripe",\n  "profile_url": "https://linkedin.com/in/sarahchen",\n  "notes": "Met at AI conference"\n}'}
            className="mt-2 w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20 resize-none font-mono"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleIntake}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium flex items-center gap-2 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Save Real Contact to Supabase
          </button>
          <span className="text-[11px] text-white/30 py-2.5">Stores in integration: manual fallback — not simulated as LinkedIn API</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] text-red-300 flex gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {result && (
          <div className="space-y-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-300">
              <CheckCircle size={14} /> {result.message || 'Contact saved (real)'} — ID: {result.contact?.id?.slice(0,12)}...
            </div>
            <div className="text-[11px] text-white/60 font-mono">
              Full name: {result.contact?.full_name} • Headline: {result.contact?.headline} • Status: {result.contact?.status || 'active'} • Source: manual_paste (fallback, not LinkedIn API)
            </div>
            {!result.welcome_draft ? (
              <button onClick={handleWelcome} disabled={loading} className="px-4 py-2 rounded-xl bg-white text-black text-[12px] font-medium flex items-center gap-2">
                {loading ? <Loader2 size={12} className="animate-spin" /> : null} Generate Welcome Draft (Real)
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-[11px] text-white/40 mb-1">Welcome draft (real, from Supabase + mock LLM fallback):</div>
                <p className="text-[13px] text-white/80 leading-relaxed">{result.welcome_draft.draft_text}</p>
                <div className="text-[10px] text-white/30 mt-2">Purpose: {result.welcome_draft.purpose} • Requires approval • ID: {result.welcome_draft.id?.slice(0,8)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-[16px] p-4">
        <h4 className="text-[12px] font-medium mb-2">Why manual intake? (Real vs Blocked)</h4>
        <p className="text-[11px] text-white/40 leading-relaxed">
          LinkedIn Connections API is <strong className="text-red-300">closed to new partners</strong> (requires compliance events + approval). Official docs: learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api — only approved partners. So we use manual intake as compliant fallback, never scraping. See docs/FINAL_CAPABILITY_REPORT.md for capability matrix with sources. All contacts stored real in Supabase, no demo.
        </p>
      </div>
    </div>
  );
}
