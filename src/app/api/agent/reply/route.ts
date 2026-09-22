import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { buildReplyPrompt } from '@/lib/prompts';
import { generateWithLLM } from '@/lib/openai';
import { checkDraftPolicy, classifyIncomingMessage } from '@/lib/policy';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact_id, incoming_message, conversation_history = [], user_id = 'philip' } = body;

    if (!incoming_message) {
      return NextResponse.json({ error: 'incoming_message required' }, { status: 400 });
    }

    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    let contact: any = body.contact_data || { id: contact_id, full_name: body.full_name || 'Contact' };
    let history = conversation_history;

    if (supabase && contact_id) {
      const { data: contactData } = await supabase.from('contacts').select('*').eq('id', contact_id).single();
      if (contactData) contact = contactData;

      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .eq('contact_id', contact_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (interactions && interactions.length > 0) {
        history = interactions;
      }
    }

    // Classify incoming message
    const classification = classifyIncomingMessage(incoming_message);
    const isSensitive = ['sales_or_negotiation', 'job_or_recruiter'].includes(classification);

    // Generate reply
    const prompt = buildReplyPrompt(contact, history, incoming_message);
    const draftText = await generateWithLLM(prompt, { temperature: 0.75, maxTokens: 400 });

    const policy = checkDraftPolicy(draftText, 'reply', contact);

    // Save interaction for incoming message
    let interactionId: string | null = null;
    if (supabase && contact_id) {
      const { data: interaction } = await supabase.from('interactions').insert({
        user_id,
        contact_id,
        kind: 'incoming_message',
        source: body.source || 'manual',
        external_event_id: body.external_event_id || null,
        content: incoming_message,
        summary: classification,
      }).select().single();
      
      if (interaction) interactionId = interaction.id;
    }

    // Save draft
    let savedDraft: any = null;
    if (supabase && contact_id) {
      const { data } = await supabase.from('drafts').insert({
        user_id,
        contact_id,
        interaction_id: interactionId,
        purpose: `reply_${classification}`,
        draft_text: draftText,
        status: isSensitive || policy.risk_level !== 'low' ? 'pending' : 'pending',
        requires_approval: true, // Always require approval for replies in mixed autonomy
      }).select().single();
      
      if (data) savedDraft = data;

      await supabase.from('agent_runs').insert({
        user_id,
        workflow_name: 'reply',
        status: 'success',
        input_summary: { contact_id, classification, incoming_length: incoming_message.length },
        output_summary: { draft_length: draftText.length, policy, classification },
      });
    }

    return NextResponse.json({
      status: 'success',
      classification,
      draft: {
        id: savedDraft?.id || 'temp-' + Date.now(),
        contact_id,
        purpose: `reply_${classification}`,
        draft_text: draftText,
        requires_approval: true,
        classification,
        risk_level: isSensitive ? 'medium' : policy.risk_level,
      },
      policy,
      needs_review: isSensitive || policy.risk_level !== 'low',
      contact: {
        id: contact.id,
        full_name: contact.full_name,
      }
    });

  } catch (error: any) {
    console.error('Reply error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
