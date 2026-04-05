type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type StreamParams = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  messages: OpenAIMessage[];
  onToken: (token: string) => void;
};

function buildMockReply(messages: OpenAIMessage[]): string {
  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')?.content ?? '';
  const summary = messages[0]?.content ?? '';
  return [
    'Mock local response:',
    '',
    `I received: ${lastUserMessage}`,
    '',
    'This build is wired for OpenAI-compatible streaming. Add an API key and compatible base URL to replace this local fallback.',
    '',
    `Context preview: ${summary.slice(0, 220)}`,
  ].join('\n');
}

async function streamMock(messages: OpenAIMessage[], onToken: (token: string) => void): Promise<string> {
  const reply = buildMockReply(messages);
  let built = '';
  for (const token of reply.split(/(\s+)/)) {
    if (!token) continue;
    built += token;
    onToken(token);
    await new Promise(resolve => window.setTimeout(resolve, 25));
  }
  return built;
}

export async function streamChatCompletion(params: StreamParams): Promise<string> {
  if (!params.apiKey || params.model.startsWith('mock')) {
    return streamMock(params.messages, params.onToken);
  }

  const response = await fetch(`${params.apiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: params.temperature,
      stream: true,
      messages: params.messages,
    }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || 'Streaming request failed.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let complete = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const lines = chunk
        .split('\n')
        .filter(line => line.startsWith('data: '))
        .map(line => line.replace(/^data:\s*/, '').trim());

      for (const line of lines) {
        if (!line || line === '[DONE]') continue;
        const payload = JSON.parse(line) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const token = payload.choices?.[0]?.delta?.content ?? '';
        if (!token) continue;
        complete += token;
        params.onToken(token);
      }
    }
  }

  return complete;
}
