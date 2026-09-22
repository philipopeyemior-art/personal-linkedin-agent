"use client";
import { useState } from 'react';
import { Search, Plus, ExternalLink, MessageSquare, Clock } from 'lucide-react';

const mockContacts = [
  { id: '1', full_name: 'Sarah Chen', headline: 'AI Infra @ Stripe', profile_url: 'https://linkedin.com/in/sarahchen', source: 'manual', created_at: '2024-12-10', relationship_notes: 'Met at AI conference, interested in agent infra', last_interaction: '2 days ago' },
  { id: '2', full_name: 'David Okafor', headline: 'Founder @ BuildLab', profile_url: 'https://linkedin.com/in/davidokafor', source: 'manual', created_at: '2024-12-08', relationship_notes: 'Potential collaboration on n8n workflows', last_interaction: '5 days ago' },
  { id: '3', full_name: 'Michael Adebayo', headline: 'Senior Engineer @ Paystack', profile_url: 'https://linkedin.com/in/michaeladebayo', source: 'manual', created_at: '2024-12-01', relationship_notes: 'Discussed payment automation', last_interaction: '2 weeks ago' },
  { id: '4', full_name: 'Aisha Bello', headline: 'Product Manager @ Flutterwave', profile_url: 'https://linkedin.com/in/aishabello', source: 'linkedin', created_at: '2024-11-28', relationship_notes: '', last_interaction: '3 weeks ago' },
];

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ full_name: '', headline: '', profile_url: '', relationship_notes: '' });
  const [contacts, setContacts] = useState(mockContacts);

  async function handleAdd() {
    if (!newContact.full_name) return;
    
    try {
      const res = await fetch('/api/agent/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'connection',
          ...newContact,
          user_id: 'philip'
        })
      });
      const data = await res.json();
      
      if (data.contact || data.status.includes('success')) {
        setContacts(prev => [{
          id: data.contact?.id || Date.now().toString(),
          ...newContact,
          source: 'manual',
          created_at: new Date().toISOString().split('T')[0],
          last_interaction: 'Just now'
        }, ...prev]);
        setNewContact({ full_name: '', headline: '', profile_url: '', relationship_notes: '' });
        setShowAdd(false);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = contacts.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.headline.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Contacts</h1>
          <p className="text-[13px] text-white/50 mt-1">Your personal relationship memory — private, only information you choose to retain.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium flex items-center gap-2">
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {showAdd && (
        <div className="glass rounded-[20px] p-6 border border-white/10">
          <h3 className="text-[14px] font-medium mb-4">Manual Intake — New Connection</h3>
          <p className="text-[11px] text-white/40 mb-4">Fallback when no LinkedIn event API exists. Submit public profile URL and context.</p>
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
              <label className="text-[11px] text-white/50 uppercase tracking-widest">Profile URL</label>
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
            <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-white text-black text-[12px] font-medium">Add & Generate Welcome</button>
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
            placeholder="Search contacts..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[13px] focus:outline-none focus:border-white/20"
          />
        </div>
        <span className="text-[12px] text-white/40">{filtered.length} contacts</span>
      </div>

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
                  <div className="text-[12px] text-white/50 mt-0.5">{contact.headline}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">{contact.source}</span>
                    <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock size={10} /> {contact.last_interaction}</span>
                  </div>
                </div>
              </div>
              <a href={contact.profile_url} target="_blank" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                <ExternalLink size={12} />
              </a>
            </div>
            {contact.relationship_notes && (
              <div className="mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-white/50 leading-relaxed">
                {contact.relationship_notes}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] flex items-center justify-center gap-1.5 hover:bg-white/10">
                <MessageSquare size={12} /> Generate Welcome
              </button>
              <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] hover:bg-white/10">View History</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
