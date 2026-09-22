export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  requires_approval: boolean;
  classification: string;
  risk_level: 'low' | 'medium' | 'high';
}

export function checkDraftPolicy(draftText: string, purpose: string, contact?: any): PolicyCheckResult {
  const lower = draftText.toLowerCase();
  
  // High risk checks
  const highRiskPhrases = [
    'i promise', 'i guarantee', 'contract', 'deal', 'agree to', 
    'confidential', 'nft', 'crypto investment', 'guaranteed return'
  ];
  
  const hasHighRisk = highRiskPhrases.some(phrase => lower.includes(phrase));
  
  if (hasHighRisk) {
    return {
      allowed: true,
      requires_approval: true,
      classification: 'sensitive_or_unclear',
      risk_level: 'high',
      reason: 'Contains potentially sensitive commitment language'
    };
  }

  // Medium risk - sales / negotiation
  const mediumRiskPhrases = ['pricing', 'proposal', 'budget', 'hire me', 'my rate'];
  const hasMediumRisk = mediumRiskPhrases.some(p => lower.includes(p));

  // Check for invented claims
  if (lower.includes('we met at') || lower.includes('as you mentioned') || lower.includes('remember when')) {
    // This is okay only if we have history, otherwise flag
    if (!contact?.relationship_notes) {
      return {
        allowed: true,
        requires_approval: true,
        classification: 'potential_hallucination',
        risk_level: 'medium',
        reason: 'May invent shared history without evidence'
      };
    }
  }

  // Check length
  if (draftText.length > 1000) {
    return {
      allowed: true,
      requires_approval: true,
      classification: 'too_long',
      risk_level: 'low',
      reason: 'Message too long for LinkedIn'
    };
  }

  // Check generic spam
  const genericPhrases = ['thanks for connecting!', 'thanks for connecting', 'let\'s connect and explore synergies'];
  const isGeneric = genericPhrases.some(p => lower === p || lower.startsWith(p + ' '));
  
  if (isGeneric) {
    return {
      allowed: false,
      requires_approval: true,
      classification: 'generic_spam',
      risk_level: 'medium',
      reason: 'Too generic, needs personalization'
    };
  }

  // Default classification based on purpose
  let classification = 'casual_greeting';
  if (purpose === 'welcome') classification = 'new_connection_welcome';
  if (purpose.includes('reply')) classification = 'reply_assistance';
  if (purpose.includes('briefing')) classification = 'reconnection';

  return {
    allowed: true,
    requires_approval: purpose !== 'note',
    classification,
    risk_level: hasMediumRisk ? 'medium' : 'low'
  };
}

export function classifyIncomingMessage(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('job') || lower.includes('hiring') || lower.includes('opportunity') || lower.includes('recruiter')) {
    return 'job_or_recruiter';
  }
  if (lower.includes('collaborat') || lower.includes('partner') || lower.includes('work together')) {
    return 'collaboration_inquiry';
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('budget') || lower.includes('proposal')) {
    return 'sales_or_negotiation';
  }
  if (lower.length < 30 && (lower.includes('hi') || lower.includes('hey') || lower.includes('hello'))) {
    return 'casual_greeting';
  }
  if (lower.includes('how are you') || lower.includes('what are you working on')) {
    return 'professional_discussion';
  }
  return 'professional_discussion';
}

export function isDuplicateEvent(userId: string, source: string, externalId: string, existingEvents: any[]): boolean {
  return existingEvents.some(e => 
    e.user_id === userId && 
    e.source === source && 
    e.external_event_id === externalId
  );
}
