import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { buildBriefingPrompt } from '@/lib/prompts';
import { generateWithLLM } from '@/lib/openai';
import { normalizeUserId } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id: rawUserId = 'philip', timezone = 'Africa/Lagos', contacts: providedContacts } = body;
    const user_id = normalizeUserId(rawUserId);

    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    let contacts: any[] = providedContacts || [];

    if (contacts.length === 0 && supabase) {
      const { data: contactsData } = await supabase.from('contacts').select(`*, interactions (created_at, kind, content, summary)`).eq('user_id', user_id).limit(20);
      if (contactsData) {
        contacts = contactsData.map((c: any) => ({
          ...c,
          last_interaction: c.interactions?.[0]?.created_at || null,
          interaction_count: c.interactions?.length || 0,
        }));
      }
      const { data: followupsData } = await supabase.from('followups').select('*, contacts(*)').eq('user_id', user_id).eq('status', 'open').lte('due_at', new Date().toISOString()).limit(10);
      if (followupsData && followupsData.length > 0) {
        followupsData.forEach((f: any) => {
          if (!contacts.find((c: any) => c.id === f.contact_id)) {
            contacts.push({ ...f.contacts, followup_reason: f.reason, followup_due: f.due_at });
          }
        });
      }
    }

    if (contacts.length === 0) {
      return NextResponse.json({
        status: 'success',
        briefing: {
          summary: 'No contacts to review today. Add some connections to get started!',
          items: [],
          generated_at: new Date().toISOString(),
          timezone,
        }
      });
    }

    const contactsToReview = contacts.filter((c: any) => {
      if (c.followup_reason) return true;
      if (!c.last_interaction) return true;
      const last = new Date(c.last_interaction).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return last < sevenDaysAgo;
    }).slice(0, 10);

    const prompt = buildBriefingPrompt(contactsToReview);
    const llmResponse = await generateWithLLM(prompt, { jsonMode: true, temperature: 0.7, maxTokens: 1500 });

    let briefingData: any;
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      briefingData = JSON.parse(jsonMatch ? jsonMatch[0] : llmResponse);
    } catch {
      briefingData = {
        summary: `You have ${contactsToReview.length} contacts to review today.`,
        items: contactsToReview.slice(0, 3).map((c: any) => ({
          contact_id: c.id,
          reason: c.followup_reason ? 'follow_up_due' : 'long_time_no_talk',
          draft: `Hey ${c.full_name?.split(' ')[0] || 'there'}! It's been a while — how have things been? I've been building some interesting AI automation projects and would love to catch up and hear what you're working on.`,
          requires_approval: true,
          context_summary: c.followup_reason || 'No recent interaction'
        }))
      };
    }

    if (supabase) {
      for (const item of briefingData.items || []) {
        if (item.contact_id && item.draft) {
          try {
            await supabase.from('drafts').insert({
              user_id,
              contact_id: item.contact_id,
              purpose: `briefing_${item.reason}`,
              draft_text: item.draft,
              status: 'pending',
              requires_approval: true,
            });
          } catch(e){ console.error(e); }
        }
      }
      try {
        await supabase.from('agent_runs').insert({
          user_id,
          workflow_name: 'morning_briefing',
          status: 'success',
          input_summary: { contacts_reviewed: contactsToReview.length, timezone },
          output_summary: briefingData,
        });
      } catch(e){ console.error(e); }
    }

    return NextResponse.json({
      status: 'success',
      briefing: {
        ...briefingData,
        generated_at: new Date().toISOString(),
        timezone,
        contacts_reviewed: contactsToReview.length,
      }
    });

  } catch (error: any) {
    console.error('Briefing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id') || 'philip';
  return POST(new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ user_id, timezone: 'Africa/Lagos' }),
    headers: { 'Content-Type': 'application/json' }
  }));
}
