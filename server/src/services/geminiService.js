// Server-side Google Gemini service. NEVER expose GEMINI_API_KEY to frontend.
import { GoogleGenerativeAI } from '@google/generative-ai';

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.GEMINI_API_KEY) return null;
  _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _client;
}

const SYSTEM_PROMPT = `You are SAHAYA AI Safety Assistant.
Your role is to help users with:
- Explaining app features (Safety Status, Trusted Circle, Journey, Check-In, Safety Timer, Incident Vault, Community Reports, Emergency Mode)
- Translating safety information between English / Hindi / Telugu
- Summarizing user-provided incident notes
- Organizing incident notes into structured timelines
- Explaining common scam / phishing indicators
- Providing general safety-preparedness information

STRICT RULES (must follow):
- NEVER diagnose a dangerous situation with certainty.
- NEVER predict criminals or identify someone as dangerous.
- NEVER guarantee personal safety.
- NEVER replace emergency services or law enforcement.
- NEVER automatically contact authorities - that requires explicit user authorization.
- If user describes immediate danger, prioritize official emergency services and trusted contacts.
- Use simple, calm, factual language.
- Keep responses concise (under 250 words) unless asked to summarize long text.`;

export async function generateAIResponse(prompt, opts = {}) {
  const client = getClient();
  if (!client) {
    return {
      available: false,
      message: 'AI assistant is not configured. Set GEMINI_API_KEY on the server.',
      reply: null,
    };
  }
  try {
    const model = client.getGenerativeModel({
      model: opts.model || 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800,
      },
    });
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    return { available: true, reply };
  } catch (e) {
    console.error('[Gemini]', e.message);
    return {
      available: false,
      message: 'AI request failed: ' + (e.message || 'unknown error'),
      reply: null,
    };
  }
}

// Specialized: summarize text
export async function summarizeText(text, focus = 'safety') {
  const prompt = `Summarize the following notes for ${focus} purposes.
Capture: key events, dates/times mentioned, locations mentioned, people mentioned by role (not name if avoidable), and any unresolved questions.
Output as 3-5 short bullet points.

TEXT:
"""
${text}
"""`;
  return generateAIResponse(prompt, { temperature: 0.2 });
}
