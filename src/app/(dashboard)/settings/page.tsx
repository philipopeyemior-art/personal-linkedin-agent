"use client";
import { useState } from 'react';

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    full_name: 'Philip Opeyemi Ogungboye',
    headline: 'Mathematics Graduate, AI Engineer, Founder of Phoslab Inc',
    location: 'Lagos, Nigeria',
    timezone: 'Africa/Lagos',
    communication_style: `Write naturally, warmly, and conversationally.
Sound like a real person, not a corporate chatbot.
Avoid generic, repetitive greetings.
Do not exaggerate achievements.
Never invent personal experiences.
Keep messages concise (2-4 sentences for welcome).`,
    goals: 'Build authentic relationships, maintain meaningful conversations, create opportunities for collaboration, learning, and professional growth.',
    avoid_topics: 'Politics, sensitive personal matters, making promises or commitments on my behalf',
    autonomy: 'mixed'
  });

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Agent Settings</h1>
        <p className="text-[13px] text-white/50 mt-1">Teach the agent to communicate like you — your professional identity, voice, and safety rules.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="glass rounded-[20px] p-6">
            <h3 className="text-[14px] font-medium mb-4">Professional Identity</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Full Name</label>
                <input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Headline</label>
                <input value={profile.headline} onChange={e => setProfile({...profile, headline: e.target.value})} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-white/50 uppercase tracking-widest">Location</label>
                  <input value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px]" />
                </div>
                <div>
                  <label className="text-[11px] text-white/50 uppercase tracking-widest">Timezone</label>
                  <input value={profile.timezone} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px]" readOnly />
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-[20px] p-6">
            <h3 className="text-[14px] font-medium mb-4">Communication Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Communication Style</label>
                <textarea value={profile.communication_style} onChange={e => setProfile({...profile, communication_style: e.target.value})} rows={6} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20 resize-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Goals for Networking</label>
                <textarea value={profile.goals} onChange={e => setProfile({...profile, goals: e.target.value})} rows={3} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20 resize-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Topics to Avoid / Escalate</label>
                <textarea value={profile.avoid_topics} onChange={e => setProfile({...profile, avoid_topics: e.target.value})} rows={2} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20 resize-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-[20px] p-5">
            <h3 className="text-[13px] font-medium mb-3">Autonomy Policy</h3>
            <div className="space-y-2">
              {[
                { id: 'draft_only', label: 'AI drafts, I approve and send', desc: 'Safest, recommended' },
                { id: 'mixed', label: 'Mixed: automate routine, ask me about important', desc: 'Balanced' },
                { id: 'auto_authorized', label: 'Automatic only where officially authorized', desc: 'Requires API approval' },
              ].map(opt => (
                <label key={opt.id} className={`block p-3 rounded-xl border cursor-pointer transition ${profile.autonomy === opt.id ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05]'}`}>
                  <div className="flex items-start gap-2.5">
                    <input type="radio" name="autonomy" checked={profile.autonomy === opt.id} onChange={() => setProfile({...profile, autonomy: opt.id})} className="mt-0.5" />
                    <div>
                      <div className={`text-[12px] font-medium ${profile.autonomy === opt.id ? 'text-black' : 'text-white/80'}`}>{opt.label}</div>
                      <div className={`text-[11px] mt-0.5 ${profile.autonomy === opt.id ? 'text-black/60' : 'text-white/40'}`}>{opt.desc}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-[11px] text-amber-200/70 leading-relaxed">
                Current: <strong>Mixed autonomy</strong>. Routine preparation automatic, external actions gated. Drafts cannot send without approval.
              </p>
            </div>
          </div>

          <div className="glass rounded-[20px] p-5">
            <h3 className="text-[13px] font-medium mb-3">System Prompt Preview</h3>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-mono text-white/40 leading-relaxed max-h-[300px] overflow-auto">
              {`You are Philip's Personal LinkedIn AI Agent...

Identity: ${profile.full_name}
${profile.headline}

Communication Style:
${profile.communication_style}

Goals:
${profile.goals}

Rules:
- ${profile.avoid_topics}
- Use only authorized information
- Respect privacy and LinkedIn's rules
- Never make promises on behalf
- If context insufficient, ask Philip`}
            </div>
          </div>

          <div className="glass rounded-[20px] p-5">
            <h3 className="text-[13px] font-medium mb-3">Environment</h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-white/40">Supabase</span><span className="text-emerald-300">Configured</span></div>
              <div className="flex justify-between"><span className="text-white/40">OpenAI</span><span className="text-emerald-300">Configured / Mock fallback</span></div>
              <div className="flex justify-between"><span className="text-white/40">Vercel Cron</span><span className="text-white/60">Ready for /api/agent/briefing</span></div>
              <div className="flex justify-between"><span className="text-white/40">n8n Workflows</span><span className="text-white/60">3 workflows in /n8n-workflows</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
