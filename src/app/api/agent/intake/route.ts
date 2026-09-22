import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      type, // 'connection' | 'message' | 'note'
      full_name,
      headline,
      profile_url,
      relationship_notes,
      content,
      contact_id,
      user_id = 'philip',
      source = 'manual_intake'
    } = body;

    const supabase = (() => {
      try { return createServerSupabase(); } catch { return null; }
    })();

    if (!supabase) {
      // Mock response when no DB
      return NextResponse.json({
        status: 'success_mock',
        message: 'Intake received (mock - no DB configured)',
        contact: { id: 'mock-' + Date.now(), full_name },
      });
    }

    let contact: any = null;

    // If contact_id provided, fetch it
    if (contact_id) {
      const { data } = await supabase.from('contacts').select('*').eq('id', contact_id).single();
      if (data) contact = data;
    }

    // Otherwise create new contact if full_name provided
    if (!contact && full_name) {
      // Check if contact exists by profile_url or name
      let existing = null;
      if (profile_url) {
        const { data } = await supabase.from('contacts').select('*').eq('profile_url', profile_url).eq('user_id', user_id).single();
        existing = data;
      }
      
      if (existing) {
        contact = existing;
        // Update notes if provided
        if (relationship_notes || headline) {
          await supabase.from('contacts').update({
            headline: headline || existing.headline,
            relationship_notes: relationship_notes || existing.relationship_notes,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        }
      } else {
        const { data, error } = await supabase.from('contacts').insert({
          user_id,
          full_name,
          headline: headline || null,
          profile_url: profile_url || null,
          relationship_notes: relationship_notes || null,
          source,
        }).select().single();
        
        if (error) throw error;
        contact = data;
      }
    }

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found and full_name required to create' }, { status: 400 });
    }

    // Create interaction based on type
    if (type && content) {
      const kindMap: any = {
        'connection': 'connection',
        'message': 'incoming_message',
        'note': 'note',
        'outgoing': 'outgoing_message'
      };

      await supabase.from('interactions').insert({
        user_id,
        contact_id: contact.id,
        kind: kindMap[type] || 'note',
        source,
        content,
        occurred_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      status: 'success',
      contact,
      message: `Contact ${contact.id} processed successfully`
    });

  } catch (error: any) {
    console.error('Intake error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
