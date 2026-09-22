"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Clock, 
  Inbox, 
  Settings, 
  Sun,
  UserPlus,
  FileText,
  Activity
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/briefings', label: 'Morning Briefing', icon: Sun },
  { href: '/drafts', label: 'Approval Inbox', icon: Inbox, badge: true },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/intake', label: 'New Intake', icon: UserPlus },
  { href: '/followups', label: 'Follow-ups', icon: Clock },
  { href: '/settings', label: 'Agent Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] min-h-screen glass border-r border-white/10 p-6 flex flex-col sticky top-0">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-bold text-white">
            P
          </div>
          <div>
            <h1 className="font-semibold text-[15px] leading-none">Philip&apos;s Agent</h1>
            <p className="text-[11px] text-white/50 mt-1">Personal LinkedIn AI</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/5">
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Mixed Autonomy • Approval Required
          </div>
          <p className="text-[11px] text-white/40 mt-1">Africa/Lagos • 08:00 Briefing</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                active 
                  ? 'bg-white text-black font-medium' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-black text-white' : 'bg-white/10 text-white/60'}`}>
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity size={14} className="text-blue-400" />
            <span className="text-[11px] font-medium text-blue-200">System Status</span>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed">
            Agent ready. Supabase connected. OpenAI configured. n8n workflows available in /n8n-workflows.
          </p>
        </div>
        <div className="mt-4 text-[10px] text-white/30 text-center">
          Phoslab Inc • Personal Agent v1
        </div>
      </div>
    </aside>
  );
}
