"use client";
import { useState, useEffect } from 'react';
import { Copy, Check, Send, Trash2, Edit3, Shield, AlertTriangle } from 'lucide-react';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([
    {
      id: '1',
      purpose: 'welcome',
      draft_text: 'Hey Sarah! Thanks for connecting — saw your work in AI infra at Stripe and it resonated. I\'ve been building AI agents and automation at Phoslab, curious what you\'re focused on these days?',
      status: 'pending',
      requires_approval: true,
      created_at: new Date().toISOString(),
      contacts: { full_name: 'Sarah Chen', headline: 'AI Infra @ Stripe', profile_url: 'https://linkedin.com/in/sarahchen' },
      policy: { classification: 'new_connection_welcome', risk_level: 'low' }
    },
    {
      id: '2',
      purpose: 'reply_collaboration_inquiry',
      draft_text: 'Thanks for reaching out, David! The collaboration idea sounds interesting — would love to hear more about what you have in mind. Are you thinking of something around AI agents or automation? Happy to jump on a quick 15-min call next week if that helps.',
      status: 'pending',
      requires_approval: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      contacts: { full_name: 'David Okafor', headline: 'Founder @ BuildLab', profile_url: 'https://linkedin.com/in/davidokafor' },
      policy: { classification: 'collaboration_inquiry', risk_level: 'medium' }
    },
    {
      id: '3',
      purpose: 'briefing_long_time_no_talk',
      draft_text: 'Hey Michael! It\'s been a while — how have things been on your end? I\'ve been building some new AI agent workflows at Phoslab and remembered our chat about automation. Would love to catch up and hear what you\'re working on lately!',
      status: 'pending',
      requires_approval: true,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      contacts: { full_name: 'Michael Adebayo', headline: 'Senior Engineer @ Paystack', profile_url: 'https://linkedin.com/in/michaeladebayo' },
      policy: { classification: 'reconnection', risk_level: 'low' }
    }
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  function copyDraft(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function approveDraft(id: string) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'approved', approved_at: new Date().toISOString() } : d));
  }

  function rejectDraft(id: string) {
    setDrafts(prev => prev.filter(d => d.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Approval Inbox</h1>
          <p className="text-[13px] text-white/50 mt-1">Review drafts, edit messages, and open the relevant LinkedIn conversation. No message sends without your approval.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5">
            <Shield size={12} /> Mixed Autonomy
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
            {drafts.filter(d => d.status === 'pending').length} pending
          </span>
        </div>
      </div>

      <div className="glass rounded-[16px] p-4 border border-amber-500/20 bg-amber-500/[0.04]">
        <div className="flex gap-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[12px] leading-relaxed">
            <span className="font-medium text-amber-200">Policy Gate Active:</span>
            <span className="text-white/60"> All drafts require approval. Bulk messaging disabled. No promises/commitments allowed. LinkedIn automation via official APIs only.</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {drafts.map(draft => (
          <div key={draft.id} className="glass rounded-[20px] p-6 card-hover transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[12px] font-bold">
                  {draft.contacts.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div className="text-[14px] font-medium flex items-center gap-2">
                    {draft.contacts.full_name}
                    <a href={draft.contacts.profile_url} target="_blank" className="text-[11px] text-blue-400 hover:text-blue-300">View LinkedIn →</a>
                  </div>
                  <div className="text-[11px] text-white/40">{draft.contacts.headline}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-1 rounded-full border ${
                  draft.policy.risk_level === 'low' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                  draft.policy.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                  'bg-red-500/10 text-red-300 border-red-500/20'
                }`}>{draft.policy.risk_level} risk • {draft.policy.classification}</span>
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
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, draft_text: editText } : d));
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white text-black text-[12px] font-medium"
                  >
                    Save edit
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
                <Edit3 size={14} /> Edit
              </button>
              <div className="flex-1" />
              <button
                onClick={() => rejectDraft(draft.id)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-300 transition"
              >
                <Trash2 size={14} /> Discard
              </button>
              <button
                onClick={() => approveDraft(draft.id)}
                className="px-5 py-2.5 rounded-xl bg-white text-black text-[12px] font-medium flex items-center gap-2 hover:bg-white/90 transition"
              >
                <Check size={14} /> Approve
              </button>
              <a
                href={draft.contacts.profile_url}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[12px] font-medium flex items-center gap-2 hover:bg-blue-500 transition"
              >
                <Send size={14} /> Open LinkedIn
              </a>
            </div>

            {draft.status === 'approved' && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                <Check size={12} /> Approved at {new Date(draft.approved_at).toLocaleTimeString()} — Copy and send manually in LinkedIn. Marked as approved in system.
              </div>
            )}
          </div>
        ))}

        {drafts.length === 0 && (
          <div className="glass rounded-[20px] p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">📭</div>
            <p className="text-[13px] text-white/60">No drafts pending</p>
            <p className="text-[11px] text-white/30 mt-1">New connection welcomes and briefing drafts will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
