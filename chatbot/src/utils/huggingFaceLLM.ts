import type { ConversationMessage } from "@/types/llm";

const LLM_CONFIG = {
  model: "Base",
  endpointUrl: 'https://josephjiminkim--language-chatbot-transformers-web-app.modal.run/v1/chat/completions',
  temperature: 0.7,
  maxTokens: 100,
  systemPrompt: `
  [INSTRUCTIONS]
  You are a Korean conversational partner for language learners.
  Respond always in Korean.
  Respond with short sentences.
  Keep conversation natural.

  PRIORITY:
  1. Match user proficiency level
  2. Prefer user interests
  3. Follow correction preference


  [USER_PROFILE]
  level: advanced

  learning goal: to understand Kpop songs and K-Dramas

  topics of interest:
   - Food
   - Music
   - Entertainment
   - Travel

  correction style:
   - always correct me
  `,
};

export async function* generateBotResponseStream(
  conversationHistory: ConversationMessage[] = []
): AsyncGenerator<string, void, unknown> {
  const messages = [
    { role: 'system', content: LLM_CONFIG.systemPrompt },
    ...conversationHistory
  ];

  try {
    const response = await fetch(LLM_CONFIG.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
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
