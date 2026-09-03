import {
  Injectable,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { PromptAiProvider } from './ai.types';

@Injectable()
export class AiProviderService implements PromptAiProvider {
  constructor(private readonly configService: ConfigService) {}

  async generate(input: { system: string; user: string }) {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('AI generation is not configured');
    }

    const baseUrl = this.configService
      .get<string>('AI_API_BASE_URL', 'https://api.openai.com/v1')
      .replace(/\/$/, '');
    const model = this.configService.get<string>('AI_MODEL', 'gpt-5-mini');
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.configService.get<number>('AI_REQUEST_TIMEOUT_MS', 60000),
    );

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: input.system },
            { role: 'user', content: input.user },
          ],
        }),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      } | null;
      if (!response.ok) {
        throw new Error(
          body?.error?.message || `AI provider returned ${response.status}`,
        );
      }

      const content = body?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('AI provider returned an empty response');
      return { content, model };
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GatewayTimeoutException('AI generation timed out');
      }
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof GatewayTimeoutException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'AI generation is temporarily unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
