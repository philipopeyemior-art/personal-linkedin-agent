import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAI() {
  if (openaiClient) return openaiClient;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY missing, using mock responses');
    return null;
  }
  
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

export async function generateWithLLM(prompt: string, options: { model?: string, maxTokens?: number, temperature?: number, jsonMode?: boolean } = {}): Promise<string> {
  const openai = getOpenAI();
  
  // Mock fallback if no API key - generates plausible drafts without LLM
  if (!openai) {
    return generateMockResponse(prompt);
  }

  try {
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that follows instructions precisely and returns only what is requested.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.7,
      ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {})
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error: any) {
    console.error('OpenAI error:', error);
    // Fallback to mock if API fails
    return generateMockResponse(prompt);
  }
}

function generateMockResponse(prompt: string): string {
  // Extract name if present
  const nameMatch = prompt.match(/Name:\s*([^\n-]+)/i);
  const name = nameMatch ? nameMatch[1].trim().split(' ')[0] : 'there';
  const headlineMatch = prompt.match(/Headline:\s*([^\n]+)/i);
  const headline = headlineMatch ? headlineMatch[1].trim() : '';
  
  if (prompt.includes('TASK: Generate a personalized welcome')) {
    const templates = [
      `Hey ${name}! Thanks for connecting — saw your work in ${headline || 'tech'} and it resonated. I've been building AI agents and automation at Phoslab, curious what you're focused on these days?`,
      `Hi ${name}! Appreciate the connection. Noticed your background in ${headline || 'building things'} — would love to hear what you're working on lately. I've been deep in AI systems and always enjoy connecting with fellow builders.`,
      `Hey ${name}, great to connect! Your experience in ${headline || 'tech'} caught my eye. I'm currently working on some interesting agent automation projects — what kind of problems are you tackling at the moment?`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  if (prompt.includes('TASK: Draft a thoughtful reply')) {
    const incomingMatch = prompt.match(/INCOMING MESSAGE:\s*"([^"]+)"/);
    const incoming = incomingMatch ? incomingMatch[1] : '';
    
    if (incoming.toLowerCase().includes('collaborat') || incoming.toLowerCase().includes('partner')) {
      return `Thanks for reaching out! That sounds interesting — I'd love to learn more about what you have in mind. What kind of collaboration are you thinking about? Happy to jump on a quick call if helpful.`;
    }
    if (incoming.toLowerCase().includes('job') || incoming.toLowerCase().includes('hiring')) {
      return `Appreciate you thinking of me! Could you share a bit more about the role and what you're looking for? I'm always open to hearing about interesting opportunities, especially around AI engineering and agents.`;
    }
    return `Thanks for the message! Good to hear from you. I've been heads down building AI automation systems at Phoslab — curious to hear more about what you're working on. What have you been focused on lately?`;
  }
  
  if (prompt.includes('TASK: Generate a morning relationship briefing')) {
    // Return JSON for briefing
    return JSON.stringify({
      summary: "You have 2 conversations worth revisiting today.",
      items: [
        {
          contact_id: "mock-1",
          reason: "long_time_no_talk",
          draft: `Hey! It's been a while — how have things been on your end? I've been building some new AI agent workflows lately and thought of you. Would love to catch up!`,
          requires_approval: true,
          context_summary: "Last interaction was a while ago"
        }
      ]
    });
  }
  
  return `Hey ${name}! Great to connect — would love to hear what you're working on these days.`;
}
