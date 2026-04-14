import type { ConversationMessage } from "@/types/llm";
import { TargetLanguage } from "@/types/survey";

const LLM_CONFIG = {
  get endpointUrl(): string {
    const url = process.env.LLM_URL;
    if (!url) throw new Error('LLM_URL environment variable is not set');
    return url;
  },
  temperature: 0.7,
  maxTokens: 100,
};

export async function warmupModel(signal?: AbortSignal): Promise<void> {
  try {
    const response = await fetch(LLM_CONFIG.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'base',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      }),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Warmup failed: ${response.status}`);
    }
  } catch (error) {
    // Silently ignore abort — that's intentional cleanup
    if (error instanceof Error && error.name === 'AbortError') return;
    throw error;
  }
}

export async function generateTextCompletion(
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch(LLM_CONFIG.endpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'base',
      messages,
      temperature: LLM_CONFIG.temperature,
      max_tokens: 300,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function* generateBotResponseStream(
  conversationHistory: ConversationMessage[] = [],
  systemPrompt: string,
  language: TargetLanguage
): AsyncGenerator<string, void, unknown> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory
  ];

  try {
    const response = await fetch(LLM_CONFIG.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: language,
        messages: messages,
        temperature: LLM_CONFIG.temperature,
        max_tokens: LLM_CONFIG.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } catch (error) {
    console.error('[LLM Error]', {
      error,
      historyLength: conversationHistory.length,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
