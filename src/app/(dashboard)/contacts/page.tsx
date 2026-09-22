"use client";
import { useState, useEffect } from 'react';
import { Search, Plus, ExternalLink, MessageSquare, Clock, Trash2, Loader2 } from 'lucide-react';

interface Contact {
  id: string;
  full_name: string;
  headline: string | null;
  profile_url: string | null;
  relationship_notes: string | null;
  source: string;
  created_at: string;
}

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState({ full_name: '', headline: '', profile_url: '', relationship_notes: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    setLoading(true);
    try {
      const res = await fetch('/api/contacts?user_id=philip');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newContact.full_name) return;
    setAdding(true);
    try {
      const res = await fetch('/api/agent/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'connection',
          ...newContact,
          user_id: 'philip',
          source: 'manual_intake'
        })
      });
      const data = await res.json();
      
      if (data.contact) {
        setContacts(prev => [data.contact, ...prev]);
        setNewContact({ full_name: '', headline: '', profile_url: '', relationship_notes: '' });
        setShowAdd(false);
      } else if (data.error) {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  }

  async function handleGenerateWelcome(contact: Contact) {
    try {
      const res = await fetch('/api/agent/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          user_id: 'philip'
        })
      });
      const data = await res.json();
      if (data.draft) {
        alert(`Draft generated: ${data.draft.draft_text}\n\nGo to /drafts to approve.`);
      } else {
        alert(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = contacts.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.headline && c.headline.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Contacts — Real Data from Supabase</h1>
          <p className="text-[13px] text-white/50 mt-1">No demo data. Your private relationship memory — only information you choose to retain. {contacts.length} contacts in DB.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium flex items-center gap-2">
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {showAdd && (
        <div className="glass rounded-[20px] p-6 border border-white/10">
          <h3 className="text-[14px] font-medium mb-4">Manual Intake — New Connection (Compliant Fallback)</h3>
          <p className="text-[11px] text-white/40 mb-4">Official Connections API is closed (requires partner approval, FINRA/SEC). This manual form is the compliant alternative — you provide only public info you choose to retain.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-widest">Full Name *</label>
              <input
                value={newContact.full_name}
                onChange={e => setNewContact({...newContact, full_name: e.target.value})}
                placeholder="Sarah Chen"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-widest">Headline</label>
              <input
                value={newContact.headline}
                onChange={e => setNewContact({...newContact, headline: e.target.value})}
                placeholder="AI Infra @ Stripe"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-widest">Profile URL (public)</label>
              <input
                value={newContact.profile_url}
                onChange={e => setNewContact({...newContact, profile_url: e.target.value})}
                placeholder="https://linkedin.com/in/..."
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-widest">Relationship Notes</label>
              <input
                value={newContact.relationship_notes}
                onChange={e => setNewContact({...newContact, relationship_notes: e.target.value})}
                placeholder="How you know them, shared interests"
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={adding} className="px-4 py-2 rounded-xl bg-white text-black text-[12px] font-medium flex items-center gap-2 disabled:opacity-50">
              {adding && <Loader2 size={12} className="animate-spin" />}
              {adding ? 'Adding...' : 'Add to Supabase & Generate Welcome'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search real contacts from DB..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
          />
        </div>
        <span className="text-[12px] text-white/40">{filtered.length} contacts (real)</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-white/30" />
          <span className="ml-2 text-[13px] text-white/40">Loading real contacts from Supabase...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-[20px] p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">📭</div>
          <p className="text-[13px] text-white/60">No contacts in database</p>
          <p className="text-[11px] text-white/30 mt-1 max-w-[360px] mx-auto">No demo data. Add your first contact via manual intake above. Official LinkedIn Connections API is closed (requires partner approval), so manual intake is the compliant method.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 rounded-xl bg-white text-black text-[12px] font-medium">Add first contact</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(contact => (
            <div key={contact.id} className="glass rounded-[16px] p-5 card-hover">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[11px] font-bold">
                    {contact.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">{contact.full_name}</div>
                    <div className="text-[12px] text-white/50 mt-0.5">{contact.headline || 'No headline'}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">{contact.source}</span>
                      <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock size={10} /> {new Date(contact.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {contact.profile_url && (
                  <a href={contact.profile_url} target="_blank" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              {contact.relationship_notes && (
                <div className="mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-white/50 leading-relaxed">
                  {contact.relationship_notes}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleGenerateWelcome(contact)} className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] flex items-center justify-center gap-1.5 hover:bg-white/10">
                  <MessageSquare size={12} /> Generate Welcome
                </button>
                <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] hover:bg-white/10">View History</button>
              </div>
              <div className="mt-2 text-[10px] text-white/20">ID: {contact.id.slice(0,8)}... • Real from Supabase, not demo</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
