import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { buildWelcomePrompt } from '@/lib/prompts';
import { generateWithLLM } from '@/lib/openai';
import { checkDraftPolicy } from '@/lib/policy';
import { normalizeUserId } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact_id, contact_data, extra_context, user_id: rawUserId = 'philip' } = body;
    const user_id = normalizeUserId(rawUserId);

    if (!contact_id && !contact_data) {
      return NextResponse.json({ error: 'contact_id or contact_data required' }, { status: 400 });
    }

    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    let contact: any = contact_data;

    if (contact_id && supabase) {
      const { data } = await supabase.from('contacts').select('*').eq('id', contact_id).single();
      if (data) contact = data;
    }

    if (!contact) {
      contact = {
        id: contact_id || 'temp',
        full_name: body.full_name || 'there',
        headline: body.headline || '',
        profile_url: body.profile_url || '',
        relationship_notes: body.relationship_notes || '',
        source: body.source || 'manual'
      };
    }

    if (supabase && contact.id && contact.id !== 'temp') {
      const { data: recentDrafts } = await supabase
        .from('drafts')
        .select('id, created_at')
        .eq('contact_id', contact.id)
        .eq('purpose', 'welcome')
        .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
      
      if (recentDrafts && recentDrafts.length > 0) {
        return NextResponse.json({
          status: 'already_processed',
          message: 'Welcome already generated in last 24h',
          draft_id: recentDrafts[0].id
        });
      }
    }

    const prompt = buildWelcomePrompt(contact, extra_context);
    const draftText = await generateWithLLM(prompt, { temperature: 0.8, maxTokens: 300 });
    const policy = checkDraftPolicy(draftText, 'welcome', contact);

    if (!policy.allowed) {
      return NextResponse.json({
        status: 'policy_rejected',
        reason: policy.reason,
        classification: policy.classification,
        draft_text: draftText
      }, { status: 422 });
    }

    let savedDraft: any = null;
    if (supabase && contact.id && contact.id !== 'temp') {
      try {
        const { data, error } = await supabase.from('drafts').insert({
          user_id,
          contact_id: contact.id,
          purpose: 'welcome',
          draft_text: draftText,
          status: 'pending',
          requires_approval: policy.requires_approval,
        }).select().single();
        if (!error) savedDraft = data;
        await supabase.from('agent_runs').insert({
          user_id,
          workflow_name: 'welcome',
          status: policy.allowed ? 'success' : 'policy_blocked',
          input_summary: { contact_id: contact.id, source: contact.source },
          output_summary: { draft_length: draftText.length, policy },
        });
      } catch (e) { console.error('DB save error', e); }
    }

    return NextResponse.json({
      status: 'success',
      draft: {
        id: savedDraft?.id || 'temp-' + Date.now(),
        contact_id: contact.id,
        purpose: 'welcome',
        draft_text: draftText,
        requires_approval: policy.requires_approval,
        classification: policy.classification,
        risk_level: policy.risk_level,
      },
      policy,
      contact: {
        id: contact.id,
        full_name: contact.full_name,
        headline: contact.headline,
      }
    });

  } catch (error: any) {
    console.error('Welcome error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
