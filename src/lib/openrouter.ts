const OPENROUTER_API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendMessage(messages: Message[]): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Kichat',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3.1:free',
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get response from AI');
  }

  const data = await response.json();
  let content = data.choices[0].message.content;
  
  // Nettoyer les tokens indésirables
  content = content.replace(/<｜begin▁of▁sentence｜>/g, '');
  content = content.replace(/<\|begin_of_sentence\|>/g, '');
  content = content.trim();
  
  return content;
}

export async function* sendMessageStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Kichat',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat-v3.1:free',
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get response from AI');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

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
              // Nettoyer les tokens indésirables
              const cleanContent = content.replace(/<｜begin▁of▁sentence｜>/g, '').replace(/<\|begin_of_sentence\|>/g, '');
              if (cleanContent) {
                yield cleanContent;
              }
            }
          } catch (e) {
            // Ignorer les lignes JSON malformées
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
