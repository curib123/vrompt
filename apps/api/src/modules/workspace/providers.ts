import { Injectable } from '@nestjs/common';
import { AIModel, ModelProvider, Prisma } from '@prisma/client';

export type ProviderOptions = {
  feature?: 'chat' | 'image_generation';
  image?: (mimeType: string, base64: string) => Promise<void>;
};
export type ProviderMessage = { role: string; content: string };
export type ProviderFile = { name: string; mimeType: string; data: Buffer };
export type NormalizedUsage = {
  input: number;
  cached: number;
  output: number;
  reasoning: number;
  raw: Record<string, unknown>;
  reported: boolean;
};
export const emptyUsage = (): NormalizedUsage => ({
  input: 0,
  cached: 0,
  output: 0,
  reasoning: 0,
  raw: {},
  reported: false,
});
export class ProviderFailure extends Error {
  constructor(
    public readonly category: string,
    public readonly retryable = true,
  ) {
    super('This model is temporarily unavailable.');
  }
}

// SSE frames can span arbitrary network chunks, including UTF-8 boundaries.
export async function* readEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (data && data !== '[DONE]')
          yield JSON.parse(data) as Record<string, any>;
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

export interface AIProvider {
  available(): boolean;
  stream(
    model: AIModel,
    messages: ProviderMessage[],
    files: ProviderFile[],
    maxOutput: number,
    signal: AbortSignal,
    delta: (text: string) => void,
    usage: NormalizedUsage,
    options?: ProviderOptions,
  ): Promise<void>;
}

async function request(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new ProviderFailure(
      `HTTP_${response.status}`,
      response.status === 429 || response.status >= 500,
    );
  }
  if (!response.body) throw new ProviderFailure('EMPTY_STREAM');
  return response.body;
}

export class OpenAIProvider implements AIProvider {
  available() {
    return Boolean(process.env.OPENAI_API_KEY);
  }
  async stream(
    model: AIModel,
    messages: ProviderMessage[],
    files: ProviderFile[],
    maxOutput: number,
    signal: AbortSignal,
    delta: (text: string) => void,
    usage: NormalizedUsage,
    options?: ProviderOptions,
  ) {
    const input: any[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    if (files.length) {
      const last = input[input.length - 1];
      last.content = [
        { type: 'input_text', text: last.content },
        ...files.map((f) =>
          f.mimeType.startsWith('image/')
            ? {
                type: 'input_image',
                image_url: `data:${f.mimeType};base64,${f.data.toString('base64')}`,
              }
            : f.mimeType === 'text/plain'
              ? {
                  type: 'input_text',
                  text: `File ${f.name}:\n${f.data.toString('utf8')}`,
                }
              : {
                  type: 'input_file',
                  filename: f.name,
                  file_data: `data:${f.mimeType};base64,${f.data.toString('base64')}`,
                },
        ),
      ];
    }
    const body = await request(
      'https://api.openai.com/v1/responses',
      { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      {
        model: model.providerModelId,
        input,
        max_output_tokens: maxOutput,
        stream: true,
        store: false,
        ...(options?.feature === 'image_generation'
          ? {
              tools: [{ type: 'image_generation', output_format: 'png' }],
              tool_choice: { type: 'image_generation' },
            }
          : {}),
      },
      signal,
    );
    let complete = false;
    for await (const e of readEvents(body)) {
      if (
        e.type === 'response.output_text.delta' ||
        e.type === 'response.refusal.delta'
      )
        delta(e.delta ?? '');
      if (e.response?.usage) {
        const u = e.response.usage;
        Object.assign(usage, {
          input: u.input_tokens ?? 0,
          cached: u.input_tokens_details?.cached_tokens ?? 0,
          output: u.output_tokens ?? 0,
          reasoning: u.output_tokens_details?.reasoning_tokens ?? 0,
          raw: u,
          reported: true,
        });
      }
      if (e.type === 'response.completed') {
        for (const item of e.response?.output ?? []) {
          if (item.type === 'image_generation_call' && item.result) {
            usage.raw = { ...usage.raw, toolCostUnverified: true };
            await options?.image?.('image/png', item.result);
          }
        }
      }
      if (e.type === 'response.completed' || e.type === 'response.incomplete')
        complete = true;
      if (e.type === 'error' || e.type === 'response.failed')
        throw new ProviderFailure('PROVIDER_ERROR');
    }
    if (!complete) throw new ProviderFailure('INTERRUPTED_STREAM');
  }
}

export class GoogleProvider implements AIProvider {
  available() {
    return Boolean(process.env.GOOGLE_AI_API_KEY);
  }
  async stream(
    model: AIModel,
    messages: ProviderMessage[],
    files: ProviderFile[],
    maxOutput: number,
    signal: AbortSignal,
    delta: (text: string) => void,
    usage: NormalizedUsage,
    options?: ProviderOptions,
  ) {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }] as any[],
    }));
    contents[contents.length - 1]!.parts.push(
      ...files.map((f) =>
        f.mimeType === 'text/plain'
          ? { text: `File ${f.name}:\n${f.data.toString('utf8')}` }
          : {
              inlineData: {
                mimeType: f.mimeType,
                data: f.data.toString('base64'),
              },
            },
      ),
    );
    const body = await request(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.providerModelId)}:streamGenerateContent?alt=sse`,
      { 'x-goog-api-key': process.env.GOOGLE_AI_API_KEY! },
      {
        contents,
        generationConfig: {
          maxOutputTokens: maxOutput,
          ...(options?.feature === 'image_generation'
            ? { responseModalities: ['TEXT', 'IMAGE'] }
            : {}),
        },
      },
      signal,
    );
    let complete = false;
    for await (const e of readEvents(body)) {
      if (e.error) throw new ProviderFailure('PROVIDER_ERROR');
      for (const part of e.candidates?.[0]?.content?.parts ?? []) {
        if (part.text && !part.thought) delta(part.text);
        if (part.inlineData?.data && options?.feature === 'image_generation') {
          await options.image?.(part.inlineData.mimeType, part.inlineData.data);
        }
      }
      if (e.candidates?.[0]?.finishReason) complete = true;
      if (e.usageMetadata) {
        const u = e.usageMetadata;
        Object.assign(usage, {
          input: u.promptTokenCount ?? 0,
          cached: u.cachedContentTokenCount ?? 0,
          output: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
          reasoning: u.thoughtsTokenCount ?? 0,
          raw: u,
          reported: true,
        });
      }
    }
    if (!complete) throw new ProviderFailure('INTERRUPTED_STREAM');
  }
}

export class AnthropicProvider implements AIProvider {
  available() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }
  async stream(
    model: AIModel,
    messages: ProviderMessage[],
    files: ProviderFile[],
    maxOutput: number,
    signal: AbortSignal,
    delta: (text: string) => void,
    usage: NormalizedUsage,
    options?: ProviderOptions,
  ) {
    if (options?.feature === 'image_generation')
      throw new ProviderFailure('UNSUPPORTED_FEATURE', false);
    const input: any[] = messages.map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: m.content }],
    }));
    input[input.length - 1].content.push(
      ...files.map((f) =>
        f.mimeType === 'text/plain'
          ? {
              type: 'text',
              text: `File ${f.name}:\n${f.data.toString('utf8')}`,
            }
          : {
              type: f.mimeType.startsWith('image/') ? 'image' : 'document',
              source: {
                type: 'base64',
                media_type: f.mimeType,
                data: f.data.toString('base64'),
              },
            },
      ),
    );
    const body = await request(
      'https://api.anthropic.com/v1/messages',
      {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      {
        model: model.providerModelId,
        messages: input,
        max_tokens: maxOutput,
        stream: true,
      },
      signal,
    );
    let complete = false;
    for await (const e of readEvents(body)) {
      if (e.type === 'error') throw new ProviderFailure('PROVIDER_ERROR');
      if (e.delta?.type === 'text_delta') delta(e.delta.text);
      const u = e.message?.usage ?? e.usage;
      if (u) {
        usage.raw = { ...usage.raw, ...u };
        usage.reported = true;
        const all = usage.raw as Record<string, number>;
        usage.cached = all.cache_read_input_tokens ?? 0;
        usage.input =
          (all.input_tokens ?? 0) +
          usage.cached +
          (all.cache_creation_input_tokens ?? 0);
        usage.output = all.output_tokens ?? 0;
      }
      if (e.type === 'message_stop') complete = true;
    }
    if (!complete) throw new ProviderFailure('INTERRUPTED_STREAM');
  }
}

export class MistralProvider implements AIProvider {
  available() {
    return Boolean(process.env.MISTRAL_API_KEY);
  }
  async stream(
    model: AIModel,
    messages: ProviderMessage[],
    files: ProviderFile[],
    maxOutput: number,
    signal: AbortSignal,
    delta: (text: string) => void,
    usage: NormalizedUsage,
    options?: ProviderOptions,
  ) {
    const input: any[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    if (files.length) {
      const last = input[input.length - 1];
      const content: any[] = [{ type: 'text', text: last.content }];
      for (const file of files) {
        if (file.mimeType === 'text/plain')
          content.push({
            type: 'text',
            text: `File ${file.name}:\n${file.data.toString('utf8')}`,
          });
        else if (file.mimeType.startsWith('image/'))
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${file.mimeType};base64,${file.data.toString('base64')}`,
            },
          });
        else throw new ProviderFailure('UNSUPPORTED_FILE', false);
      }
      last.content = content;
    }
    const body = await request(
      'https://api.mistral.ai/v1/chat/completions',
      { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
      {
        model: model.providerModelId,
        messages: input,
        max_tokens: maxOutput,
        stream: true,
        ...(options?.feature === 'image_generation'
          ? { tools: [{ type: 'image_generation' }] }
          : {}),
      },
      signal,
    );
    let complete = false;
    for await (const event of readEvents(body)) {
      if (event.error) throw new ProviderFailure('PROVIDER_ERROR');
      const choice = event.choices?.[0];
      const content = choice?.delta?.content;
      if (typeof content === 'string') delta(content);
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (part?.type === 'text' && typeof part.text === 'string')
            delta(part.text);
          if (
            part?.type === 'tool_file' &&
            part.tool === 'image_generation' &&
            part.file_id
          ) {
            const response = await fetch(
              `https://api.mistral.ai/v1/files/${encodeURIComponent(part.file_id)}/content`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
                },
                signal,
                redirect: 'error',
              },
            );
            if (!response.ok || !response.body)
              throw new ProviderFailure('IMAGE_DOWNLOAD_FAILED');
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let size = 0;
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                size += value.length;
                if (size > 20_000_000) {
                  await reader.cancel();
                  throw new ProviderFailure('OUTPUT_LIMIT', false);
                }
                chunks.push(value);
              }
            } finally {
              reader.releaseLock();
            }
            usage.raw.toolCostUnverified = true;
            await options?.image?.(
              'image/png',
              Buffer.concat(chunks).toString('base64'),
            );
          }
        }
      }
      if (choice?.finish_reason) complete = true;
      if (event.usage) {
        const u = event.usage;
        Object.assign(usage, {
          input: u.prompt_tokens ?? 0,
          output: u.completion_tokens ?? 0,
          raw: { ...usage.raw, ...u },
          reported: true,
        });
      }
    }
    if (!complete) throw new ProviderFailure('INTERRUPTED_STREAM');
  }
}

@Injectable()
export class ProviderRegistry {
  private readonly providers: Record<ModelProvider, AIProvider> = {
    OPENAI: new OpenAIProvider(),
    GOOGLE: new GoogleProvider(),
    ANTHROPIC: new AnthropicProvider(),
    MISTRAL: new MistralProvider(),
  };
  get(provider: ModelProvider) {
    return this.providers[provider];
  }
}

export function estimateCost(model: AIModel, usage: NormalizedUsage) {
  const cacheWrite = Number(usage.raw.cache_creation_input_tokens ?? 0);
  const additional = model.additionalPrices as Record<string, number>;
  return new Prisma.Decimal(
    Math.max(0, usage.input - usage.cached - cacheWrite),
  )
    .mul(model.inputPrice)
    .add(new Prisma.Decimal(usage.cached).mul(model.cachedInputPrice))
    .add(
      new Prisma.Decimal(cacheWrite).mul(
        additional.cacheWriteInputPrice ?? model.inputPrice,
      ),
    )
    .add(new Prisma.Decimal(usage.output).mul(model.outputPrice))
    .div(1_000_000);
}
