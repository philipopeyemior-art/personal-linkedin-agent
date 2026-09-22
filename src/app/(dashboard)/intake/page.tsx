"use client";
import { useState } from 'react';
import { UserPlus, MessageSquare, FileText, Send } from 'lucide-react';

export default function IntakePage() {
  const [type, setType] = useState<'connection' | 'message'>('connection');
  const [form, setForm] = useState({
    full_name: '',
    headline: '',
    profile_url: '',
    relationship_notes: '',
    content: '',
    contact_id: ''
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [welcomeDraft, setWelcomeDraft] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    setWelcomeDraft(null);
    
    try {
      // First intake
      const intakeRes = await fetch('/api/agent/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type === 'connection' ? 'connection' : 'message',
          ...form,
          user_id: 'philip',
          source: 'manual_intake'
        })
      });
      const intakeData = await intakeRes.json();
      setResult(intakeData);

      // If connection, generate welcome
      if (type === 'connection' && (intakeData.contact || form.full_name)) {
        const contactId = intakeData.contact?.id;
        const welcomeRes = await fetch('/api/agent/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: contactId,
            contact_data: {
              id: contactId,
              full_name: form.full_name,
              headline: form.headline,
              profile_url: form.profile_url,
              relationship_notes: form.relationship_notes,
              source: 'manual'
            },
            extra_context: form.relationship_notes,
            user_id: 'philip'
          })
        });
        const welcomeData = await welcomeRes.json();
        if (welcomeData.draft) {
          setWelcomeDraft(welcomeData.draft.draft_text);
        }
      }

      // If message, generate reply
      if (type === 'message' && form.content) {
        const replyRes = await fetch('/api/agent/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: form.contact_id || undefined,
            contact_data: form.full_name ? { full_name: form.full_name, headline: form.headline } : undefined,
            incoming_message: form.content,
            user_id: 'philip',
            source: 'manual_intake'
          })
        });
        const replyData = await replyRes.json();
        if (replyData.draft) {
          setWelcomeDraft(replyData.draft.draft_text);
        }
      }

    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[800px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Manual Intake</h1>
        <p className="text-[13px] text-white/50 mt-1">Fallback when LinkedIn API events are not available. Paste public info and let agent draft in your voice.</p>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/10 w-fit">
        <button
          onClick={() => setType('connection')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 transition ${type === 'connection' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
        >
          <UserPlus size={14} /> New Connection
        </button>
        <button
          onClick={() => setType('message')}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 transition ${type === 'message' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
        >
          <MessageSquare size={14} /> Incoming Message
        </button>
      </div>

      <div className="glass rounded-[20px] p-6">
        <h3 className="text-[14px] font-medium mb-4 flex items-center gap-2">
          {type === 'connection' ? <UserPlus size={16} /> : <MessageSquare size={16} />}
          {type === 'connection' ? 'New Connection Intake' : 'Message Reply Intake'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-white/50 uppercase tracking-widest">Full Name {type === 'connection' && '*'}</label>
            <input
              value={form.full_name}
              onChange={e => setForm({...form, full_name: e.target.value})}
              placeholder="e.g. Sarah Chen"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/50 uppercase tracking-widest">Headline</label>
            <input
              value={form.headline}
              onChange={e => setForm({...form, headline: e.target.value})}
              placeholder="e.g. AI Infra @ Stripe"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-white/50 uppercase tracking-widest">Profile URL (public)</label>
            <input
              value={form.profile_url}
              onChange={e => setForm({...form, profile_url: e.target.value})}
              placeholder="https://linkedin.com/in/..."
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-white/50 uppercase tracking-widest">
              {type === 'connection' ? 'Relationship Notes / Context' : 'Contact ID (if existing)'}
            </label>
            {type === 'connection' ? (
              <input
                value={form.relationship_notes}
                onChange={e => setForm({...form, relationship_notes: e.target.value})}
                placeholder="How you know them, shared interests, context for personalization"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
              />
            ) : (
              <input
                value={form.contact_id}
                onChange={e => setForm({...form, contact_id: e.target.value})}
                placeholder="Optional: existing contact ID for history"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
              />
            )}
          </div>
          {type === 'message' && (
            <div className="col-span-2">
              <label className="text-[11px] text-white/50 uppercase tracking-widest">Incoming Message *</label>
              <textarea
                value={form.content}
                onChange={e => setForm({...form, content: e.target.value})}
                placeholder="Paste the message they sent you..."
                rows={4}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20 resize-none"
              />
              <p className="text-[11px] text-white/30 mt-1.5">Treated as untrusted input — cannot override agent instructions</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || (type === 'connection' && !form.full_name) || (type === 'message' && !form.content)}
          className="mt-6 w-full py-3 rounded-xl bg-white text-black text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {loading ? 'Processing...' : type === 'connection' ? 'Create Contact & Generate Welcome' : 'Generate Reply Draft'}
        </button>

        {result && (
          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[12px]">
            <div className="text-white/50">Result:</div>
            <pre className="mt-1 text-white/70 whitespace-pre-wrap text-[11px]">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        {welcomeDraft && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-blue-400" />
              <span className="text-[12px] font-medium text-blue-200">Generated Draft (Pending Approval)</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/20">Requires approval</span>
            </div>
            <p className="text-[13px] leading-relaxed text-white/80">{welcomeDraft}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigator.clipboard.writeText(welcomeDraft)}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-[11px] hover:bg-white/15"
              >
                Copy draft
              </button>
              <a href={form.profile_url} target="_blank" className="px-3 py-1.5 rounded-xl bg-white text-black text-[11px] font-medium">Open LinkedIn</a>
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-[16px] p-4 border border-white/5">
        <h4 className="text-[12px] font-medium mb-2">Why manual intake?</h4>
        <p className="text-[11px] text-white/40 leading-relaxed">
          LinkedIn&apos;s official APIs have restricted access to personal inbox and connections. No approved webhook exists for new connections for most developers.
          Manual intake ensures you stay compliant: you provide only public info you choose to retain, agent drafts in your voice, you approve and send.
          No browser automation, no password storage, no scraping.
        </p>
      </div>
    </div>
  );
}
