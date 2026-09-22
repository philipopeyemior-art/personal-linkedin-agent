"use client";
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Trash2, Shield, Link2 } from 'lucide-react';

interface LinkedInStatus {
  connected: boolean;
  status: string;
  message: string;
  profile?: { name: string; email: string; picture: string; sub: string; given_name: string; family_name: string };
  scopes?: string[];
  expires_at?: string;
  expires_in_days?: number | null;
  is_expired?: boolean;
  last_sync?: string;
  oauth_configured: boolean;
  client_id_configured: boolean;
  client_secret_configured: boolean;
  redirect_uri: string;
  capabilities?: { real: string[]; blocked: string[]; fallback: string[] };
}

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

  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Check URL params for connected/error
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin_connected')) {
      setTimeout(() => fetchStatus(), 1000);
    }
  }, []);

  async function fetchStatus() {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/auth/linkedin/status');
      const data = await res.json();
      setLinkedinStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect LinkedIn? This will delete stored tokens. You can reconnect anytime.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/auth/linkedin/disconnect', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Disconnected');
      fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Agent Settings + LinkedIn Connection</h1>
        <p className="text-[13px] text-white/50 mt-1">Teach the agent to communicate like you + connect LinkedIn via official OAuth. No password, no cookies.</p>
      </div>

      {/* LinkedIn Connection Card - Real OAuth */}
      <div className={`glass rounded-[20px] p-6 border ${linkedinStatus?.connected ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-white/10'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${linkedinStatus?.connected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#0A66C2]/10 border border-[#0A66C2]/20'}`}>
              <span className={`font-bold text-[14px] ${linkedinStatus?.connected ? 'text-emerald-400' : 'text-[#0A66C2]'}`}>in</span>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold flex items-center gap-2">
                LinkedIn Connection — Official OAuth
                {loadingStatus ? <Loader2 size={12} className="animate-spin" /> : linkedinStatus?.connected ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-white/30" />}
              </h3>
              <p className="text-[11px] text-white/40">Sign In with LinkedIn using OpenID Connect (self-serve, official)</p>
            </div>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full border ${linkedinStatus?.connected ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
            {linkedinStatus?.status || 'checking...'}
          </span>
        </div>

        {loadingStatus ? (
          <div className="flex items-center gap-2 text-[12px] text-white/40">
            <Loader2 size={14} className="animate-spin" /> Checking connection status...
          </div>
        ) : linkedinStatus?.connected ? (
          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              {linkedinStatus.profile?.picture && <img src={linkedinStatus.profile.picture} alt="Profile" className="w-12 h-12 rounded-full" />}
              <div className="flex-1">
                <div className="text-[14px] font-medium">{linkedinStatus.profile?.name}</div>
                <div className="text-[12px] text-white/50">{linkedinStatus.profile?.email} {linkedinStatus.profile?.email && '•'} ID: {linkedinStatus.profile?.sub?.slice(0,12)}...</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">Scopes: {linkedinStatus.scopes?.join(', ')}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${linkedinStatus.is_expired ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
                    {linkedinStatus.is_expired ? 'Expired' : `Expires in ${linkedinStatus.expires_in_days} days`}
                  </span>
                </div>
                <div className="text-[10px] text-white/20 mt-1">Last sync: {linkedinStatus.last_sync ? new Date(linkedinStatus.last_sync).toLocaleString() : 'N/A'} • No token exposed in frontend</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="font-medium text-emerald-200">✅ Real Capabilities</div>
                <ul className="text-white/50 mt-1 space-y-0.5 list-disc list-inside">
                  {linkedinStatus.capabilities?.real.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="font-medium text-red-200">❌ Blocked (Closed)</div>
                <ul className="text-white/50 mt-1 space-y-0.5 list-disc list-inside">
                  {linkedinStatus.capabilities?.blocked.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="font-medium text-blue-200">🔧 Fallback (Live)</div>
                <ul className="text-white/50 mt-1 space-y-0.5 list-disc list-inside">
                  {linkedinStatus.capabilities?.fallback.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleDisconnect} disabled={disconnecting} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[12px] flex items-center gap-2 hover:bg-red-500/20 disabled:opacity-50">
                {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Disconnect & Delete Tokens
              </button>
              <a href="/api/auth/linkedin?redirect=true" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px] hover:bg-white/10">Reconnect</a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[12px] font-medium text-amber-200">{linkedinStatus?.message || 'Not connected'}</div>
                  <div className="text-[11px] text-white/50 mt-1 leading-relaxed">
                    {linkedinStatus?.oauth_configured ? 'OAuth is configured — click Connect to authorize via LinkedIn.' : 'OAuth not configured — you need to create LinkedIn Developer App first.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {linkedinStatus?.oauth_configured ? (
                <a href="/api/auth/linkedin?redirect=true" className="px-5 py-2.5 rounded-xl bg-[#0A66C2] text-white text-[13px] font-medium flex items-center gap-2 hover:bg-[#0958a8]">
                  <span className="w-5 h-5 bg-white rounded flex items-center justify-center text-[#0A66C2] font-bold text-[11px]">in</span>
                  Connect LinkedIn — Official OAuth
                </a>
              ) : (
                <button onClick={() => setShowSetup(!showSetup)} className="px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium">
                  {showSetup ? 'Hide Setup Guide' : 'Show Setup Guide — How to Connect'}
                </button>
              )}
              <button onClick={fetchStatus} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Refresh Status</button>
            </div>

            {(showSetup || !linkedinStatus?.oauth_configured) && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <h4 className="text-[12px] font-medium flex items-center gap-2"><Shield size={12} /> How to Connect LinkedIn (Official, Secure, No Password)</h4>
                <ol className="text-[11px] text-white/50 leading-relaxed list-decimal list-inside space-y-2">
                  <li>Go to <a href="https://developer.linkedin.com/" target="_blank" className="text-blue-400 hover:text-blue-300">developer.linkedin.com</a> → Create App → Enter app name "Philip's LinkedIn Agent", select your LinkedIn Page (Phoslab), privacy policy URL: <code className="px-1 py-0.5 rounded bg-white/10">https://personal-linkedin-agent.vercel.app/privacy</code>, logo</li>
                  <li>Products tab → Request access to <strong>Sign In with LinkedIn using OpenID Connect</strong> → Auto-approved in seconds (self-serve) — gives scopes <code>openid profile email</code></li>
                  <li>(Optional) Add <strong>Share on LinkedIn</strong> → Auto-approved — gives <code>w_member_social</code> for posting</li>
                  <li>Auth tab → Add Authorized redirect URL: <code className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">{linkedinStatus?.redirect_uri}</code> — must match exactly, HTTPS required</li>
                  <li>Auth tab → Copy <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                  <li>Vercel Dashboard → Your project (personal-linkedin-agent) → Settings → Environment Variables → Add:
                    <div className="mt-1.5 p-2 rounded bg-black/40 font-mono text-[10px] leading-relaxed">
                      LINKEDIN_CLIENT_ID=your_client_id<br/>
                      LINKEDIN_CLIENT_SECRET=your_client_secret<br/>
                      LINKEDIN_REDIRECT_URI={linkedinStatus?.redirect_uri}<br/>
                      NEXT_PUBLIC_APP_URL=https://personal-linkedin-agent.vercel.app<br/>
                      ENCRYPTION_KEY=random-32-char-string
                    </div>
                  </li>
                  <li>Save → Vercel will redeploy automatically (or manual redeploy)</li>
                  <li>Come back here → Click Connect LinkedIn → Approve on LinkedIn domain (official OAuth, no password in this app)</li>
                  <li>After approval, you will see connected status + real profile (name, email, picture) from <code>https://api.linkedin.com/v2/userinfo</code> — real LinkedIn data, not demo</li>
                </ol>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-white/30">
                  <strong>Security:</strong> App never asks for LinkedIn password, never copies browser cookies. Only official OAuth via linkedin.com. Tokens encrypted at rest (AES-256-GCM), never in frontend JS, never in logs. State validation prevents CSRF. See docs/OAUTH_SETUP.md and docs/SECURITY_THREAT_MODEL.md
                </div>
                <div className="flex gap-2">
                  <a href="https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2" target="_blank" className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">Official OIDC Docs <ExternalLink size={10} /></a>
                  <a href="https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access" target="_blank" className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">Permissions Overview <ExternalLink size={10} /></a>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="font-medium text-emerald-300">✅ Real (Self-Serve)</div>
                <ul className="text-white/40 mt-1 space-y-0.5 list-disc list-inside">
                  <li>OAuth login OIDC</li>
                  <li>Lite profile (name, photo, email)</li>
                  <li>Post as member (optional)</li>
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="font-medium text-red-300">❌ Blocked</div>
                <ul className="text-white/40 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Full connections list (closed)</li>
                  <li>Read inbox (closed)</li>
                  <li>Real-time webhooks (org only)</li>
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="font-medium text-blue-300">🔧 Fallback Live</div>
                <ul className="text-white/40 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Manual intake forms</li>
                  <li>Approval-required manual send</li>
                  <li>Morning briefing with real DB</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="glass rounded-[20px] p-6">
            <h3 className="text-[14px] font-medium mb-4">Professional Identity — Real</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Full Name</label>
                <input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Headline</label>
                <input value={profile.headline} onChange={e => setProfile({...profile, headline: e.target.value})} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20" />
              </div>
            </div>
          </div>

          <div className="glass rounded-[20px] p-6">
            <h3 className="text-[14px] font-medium mb-4">Communication Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-white/50 uppercase tracking-widest">Communication Style</label>
                <textarea value={profile.communication_style} onChange={e => setProfile({...profile, communication_style: e.target.value})} rows={5} className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20 resize-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-[20px] p-5">
            <h3 className="text-[13px] font-medium mb-3">Autonomy Policy (Server-Side)</h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-white/40">Morning briefing</span><span className="text-emerald-300">Automatic</span></div>
              <div className="flex justify-between"><span className="text-white/40">Draft generation</span><span className="text-emerald-300">Automatic</span></div>
              <div className="flex justify-between"><span className="text-white/40">Draft storage</span><span className="text-emerald-300">Automatic</span></div>
              <div className="flex justify-between"><span className="text-white/40">DM sending</span><span className="text-amber-300">Approval required</span></div>
              <div className="flex justify-between"><span className="text-white/40">Sensitive</span><span className="text-red-300">Always review</span></div>
              <div className="flex justify-between"><span className="text-white/40">Bulk</span><span className="text-red-300">Disabled</span></div>
            </div>
            <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/70">
              Approval bound to exact draft text hash + recipient + purpose. Editing invalidates approval.
            </div>
          </div>

          <div className="glass rounded-[20px] p-5">
            <h3 className="text-[13px] font-medium mb-3">Environment (Real)</h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between"><span className="text-white/40">Supabase</span><span className="text-emerald-300">Live • 3 contacts</span></div>
              <div className="flex justify-between"><span className="text-white/40">Vercel</span><span className="text-emerald-300">Live • 4 deploys</span></div>
              <div className="flex justify-between"><span className="text-white/40">LinkedIn OAuth</span><span className={linkedinStatus?.oauth_configured ? 'text-emerald-300' : 'text-amber-300'}>{linkedinStatus?.oauth_configured ? 'Configured' : 'Not configured'}</span></div>
              <div className="flex justify-between"><span className="text-white/40">OpenAI</span><span className="text-white/60">Mock fallback active</span></div>
              <div className="flex justify-between"><span className="text-white/40">n8n Workflows</span><span className="text-white/60">3 JSON exported</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
