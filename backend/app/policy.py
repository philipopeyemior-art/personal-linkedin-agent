from typing import Literal
from .schemas import PolicyCheckResult

def check_draft_policy(draft_text: str, purpose: str, contact: dict = None) -> PolicyCheckResult:
    lower = draft_text.lower()
    
    high_risk_phrases = [
        'i promise', 'i guarantee', 'contract', 'deal', 'agree to', 
        'confidential', 'nft', 'crypto investment', 'guaranteed return'
    ]
    
    has_high_risk = any(phrase in lower for phrase in high_risk_phrases)
    
    if has_high_risk:
        return PolicyCheckResult(
            allowed=True,
            requires_approval=True,
            classification='sensitive_or_unclear',
            risk_level='high',
            reason='Contains potentially sensitive commitment language'
        )

    medium_risk_phrases = ['pricing', 'proposal', 'budget', 'hire me', 'my rate']
    has_medium_risk = any(p in lower for p in medium_risk_phrases)

    if ('we met at' in lower or 'as you mentioned' in lower or 'remember when' in lower):
        if not contact or not contact.get('relationship_notes'):
            return PolicyCheckResult(
                allowed=True,
                requires_approval=True,
                classification='potential_hallucination',
                risk_level='medium',
                reason='May invent shared history without evidence'
            )

    if len(draft_text) > 1000:
        return PolicyCheckResult(
            allowed=True,
            requires_approval=True,
            classification='too_long',
            risk_level='low',
            reason='Message too long for LinkedIn'
        )

    generic_phrases = ['thanks for connecting!', 'thanks for connecting', "let's connect and explore synergies"]
    is_generic = any(lower == p or lower.startswith(p + ' ') for p in generic_phrases)
    
    if is_generic:
        return PolicyCheckResult(
            allowed=False,
            requires_approval=True,
            classification='generic_spam',
            risk_level='medium',
            reason='Too generic, needs personalization'
        )

    classification = 'casual_greeting'
    if 'welcome' in purpose:
        classification = 'new_connection_welcome'
    elif 'reply' in purpose:
        classification = 'reply_assistance'
    elif 'briefing' in purpose:
        classification = 'reconnection'

    return PolicyCheckResult(
        allowed=True,
        requires_approval=purpose != 'note',
        classification=classification,
        risk_level='medium' if has_medium_risk else 'low'
    )

def classify_incoming_message(message: str) -> str:
    lower = message.lower()
    
    if any(word in lower for word in ['job', 'hiring', 'opportunity', 'recruiter']):
        return 'job_or_recruiter'
    if any(word in lower for word in ['collaborat', 'partner', 'work together']):
        return 'collaboration_inquiry'
    if any(word in lower for word in ['price', 'cost', 'budget', 'proposal']):
        return 'sales_or_negotiation'
    if len(lower) < 30 and any(word in lower for word in ['hi', 'hey', 'hello']):
        return 'casual_greeting'
    if any(word in lower for word in ['how are you', 'what are you working on']):
        return 'professional_discussion'
    return 'professional_discussion'

def is_prompt_injection(message: str) -> bool:
    lower = message.lower()
    injection_patterns = [
        'ignore previous instructions',
        'system:',
        'you are now',
        'disregard',
        'forget your instructions',
        'act as',
        'pretend to be'
    ]
    return any(pattern in lower for pattern in injection_patterns)
