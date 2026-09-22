"use client";
import { useState, useEffect } from 'react';
import { Copy, Check, Send, Trash2, Edit3, Shield, AlertTriangle, Loader2 } from 'lucide-react';

interface Draft {
  id: string;
  purpose: string;
  draft_text: string;
  status: string;
  requires_approval: boolean;
  created_at: string;
  approved_at?: string;
  contacts?: { full_name: string; headline: string; profile_url: string };
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchDrafts();
  }, []);

  async function fetchDrafts() {
    setLoading(true);
    try {
      const res = await fetch('/api/drafts?user_id=philip');
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function copyDraft(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function updateDraft(id: string, action: string, draftText?: string) {
    try {
      const res = await fetch('/api/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, draft_text: draftText })
      });
      const data = await res.json();
      if (data.draft) {
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...data.draft, contacts: d.contacts } : d));
      }
      if (action === 'reject') {
        setDrafts(prev => prev.filter(d => d.id !== id));
      }
      if (action === 'edit') {
        setEditingId(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const pending = drafts.filter(d => d.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Approval Inbox — Real from Supabase</h1>
          <p className="text-[13px] text-white/50 mt-1">No demo data. Review real drafts from DB, edit, approve, reject, track. No message sends without your approval.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5">
            <Shield size={12} /> Mixed Autonomy
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
            {pending.length} pending (real)
          </span>
        </div>
      </div>

      <div className="glass rounded-[16px] p-4 border border-amber-500/20 bg-amber-500/[0.04]">
        <div className="flex gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[12px] leading-relaxed">
            <span className="font-medium text-amber-200">Policy Gate Active (Server-Side):</span>
            <span className="text-white/60"> All drafts require approval. Bulk disabled. No promises/commitments. Editing after approval invalidates approval (hash binding). LinkedIn automation via official APIs only — auto-send disabled by default.</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-white/30" />
          <span className="ml-2 text-[13px] text-white/40">Loading real drafts from Supabase...</span>
        </div>
      ) : drafts.length === 0 ? (
        <div className="glass rounded-[20px] p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">📭</div>
          <p className="text-[13px] text-white/60">No drafts in database</p>
          <p className="text-[11px] text-white/30 mt-1">No demo data. Add contacts via /intake or /contacts → Generate welcome → Drafts appear here with real DB persistence.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map(draft => (
            <div key={draft.id} className="glass rounded-[20px] p-6 card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[12px] font-bold">
                    {draft.contacts?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2) || '??'}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium flex items-center gap-2">
                      {draft.contacts?.full_name || 'Unknown Contact'}
                      {draft.contacts?.profile_url && <a href={draft.contacts.profile_url} target="_blank" className="text-[11px] text-blue-400 hover:text-blue-300">View LinkedIn →</a>}
                    </div>
                    <div className="text-[11px] text-white/40">{draft.contacts?.headline || draft.purpose} • ID: {draft.id.slice(0,8)} • Real from DB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full border ${draft.status === 'pending' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : draft.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>{draft.status}</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/40">{draft.purpose}</span>
                </div>
              </div>

              {editingId === draft.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full min-h-[100px] p-4 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] leading-relaxed focus:outline-none focus:border-white/20"
                  />
                  <p className="text-[11px] text-amber-300/60">Editing will invalidate previous approval (hash binding) and set status back to pending.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateDraft(draft.id, 'edit', editText)}
                      className="px-4 py-2 rounded-xl bg-white text-black text-[12px] font-medium"
                    >
                      Save edit (invalidates approval)
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[13px] leading-relaxed text-white/80">{draft.draft_text}</p>
                  <div className="flex items-center gap-2 mt-3 text-[11px] text-white/30">
                    <span>{new Date(draft.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span>{draft.draft_text.length} chars</span>
                    <span>•</span>
                    <span className="text-amber-300/60">Requires approval: {draft.requires_approval ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => copyDraft(draft.draft_text, draft.id)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/10 transition"
                >
                  {copiedId === draft.id ? <Check size={14} /> : <Copy size={14} />}
                  {copiedId === draft.id ? 'Copied!' : 'Copy draft'}
                </button>
                <button
                  onClick={() => { setEditingId(draft.id); setEditText(draft.draft_text); }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/10 transition"
                >
                  <Edit3 size={14} /> Edit (invalidates approval)
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => updateDraft(draft.id, 'reject')}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300 transition"
                >
                  <Trash2 size={14} /> Discard
                </button>
                <button
                  onClick={() => updateDraft(draft.id, 'approve')}
                  className="px-5 py-2.5 rounded-xl bg-white text-black text-[12px] font-medium flex items-center gap-2 hover:bg-white/90 transition"
                >
                  <Check size={14} /> Approve
                </button>
                {draft.contacts?.profile_url ? (
                  <a
                    href={draft.contacts.profile_url}
                    target="_blank"
                    onClick={() => updateDraft(draft.id, 'sent_manually')}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[12px] font-medium flex items-center gap-2 hover:bg-blue-500 transition"
                  >
                    <Send size={14} /> Open LinkedIn + Mark Sent
                  </a>
                ) : (
                  <button onClick={() => updateDraft(draft.id, 'sent_manually')} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[12px] font-medium">Mark Sent Manually</button>
                )}
              </div>

              {draft.status === 'approved' && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                  <Check size={12} /> Approved at {draft.approved_at ? new Date(draft.approved_at).toLocaleTimeString() : 'now'} — Copy and send manually in LinkedIn. Bound to exact draft text hash.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
