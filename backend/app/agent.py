import os
import json
import random
from typing import Optional
from .config import settings
from .prompts import build_welcome_prompt, build_reply_prompt, build_briefing_prompt

try:
    from openai import OpenAI
    openai_available = True
except ImportError:
    openai_available = False

_client = None

def get_openai_client():
    global _client
    if _client:
        return _client
    if not settings.openai_api_key or not openai_available:
        return None
    if settings.openai_api_key.startswith("sk-placeholder"):
        return None
    try:
        _client = OpenAI(api_key=settings.openai_api_key)
        return _client
    except Exception as e:
        print(f"OpenAI client error: {e}")
        return None

def generate_mock_response(prompt: str) -> str:
    name_match = None
    import re
    m = re.search(r'Name:\s*([^\n-]+)', prompt, re.I)
    name = m.group(1).strip().split(' ')[0] if m else 'there'
    hm = re.search(r'Headline:\s*([^\n]+)', prompt, re.I)
    headline = hm.group(1).strip() if hm else ''

    if 'TASK: Generate a personalized welcome' in prompt:
        templates = [
            f"Hey {name}! Thanks for connecting — saw your work in {headline or 'tech'} and it resonated. I've been building AI agents and automation at Phoslab, curious what you're focused on these days?",
            f"Hi {name}! Appreciate the connection. Noticed your background in {headline or 'building things'} — would love to hear what you're working on lately. I've been deep in AI systems and always enjoy connecting with fellow builders.",
            f"Hey {name}, great to connect! Your experience in {headline or 'tech'} caught my eye. I'm currently working on some interesting agent automation projects — what kind of problems are you tackling at the moment?"
        ]
        return random.choice(templates)
    
    if 'TASK: Draft a thoughtful reply' in prompt:
        incoming_match = re.search(r'INCOMING MESSAGE.*?"([^"]+)"', prompt, re.S)
        incoming = incoming_match.group(1) if incoming_match else ''
        if 'collaborat' in incoming.lower() or 'partner' in incoming.lower():
            return "Thanks for reaching out! That sounds interesting — I'd love to learn more about what you have in mind. What kind of collaboration are you thinking about? Happy to jump on a quick call if helpful."
        if 'job' in incoming.lower() or 'hiring' in incoming.lower():
            return "Appreciate you thinking of me! Could you share a bit more about the role and what you're looking for? I'm always open to hearing about interesting opportunities, especially around AI engineering and agents."
        return "Thanks for the message! Good to hear from you. I've been heads down building AI automation systems at Phoslab — curious to hear more about what you're working on. What have you been focused on lately?"
    
    if 'TASK: Generate a morning relationship briefing' in prompt:
        return json.dumps({
            "summary": "You have 2 conversations worth revisiting today.",
            "items": [
                {
                    "contact_id": "mock-1",
                    "reason": "long_time_no_talk",
                    "draft": "Hey! It's been a while — how have things been on your end? I've been building some new AI agent workflows lately and thought of you. Would love to catch up!",
                    "requires_approval": True,
                    "context_summary": "Last interaction was a while ago"
                }
            ]
        })
    
    return f"Hey {name}! Great to connect — would love to hear what you're working on these days."

async def generate_with_llm(prompt: str, model: str = "gpt-4o-mini", max_tokens: int = 800, temperature: float = 0.7, json_mode: bool = False) -> str:
    client = get_openai_client()
    
    if not client:
        return generate_mock_response(prompt)
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that follows instructions precisely and returns only what is requested."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            **({"response_format": {"type": "json_object"}} if json_mode else {})
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI error: {e}, falling back to mock")
        return generate_mock_response(prompt)
