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

  async generate(input: {
    system: string;
    user: string;
    safetyIdentifier: string;
  }) {
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
      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          instructions: input.system,
          input: input.user,
          max_output_tokens: this.configService.get<number>(
            'AI_MAX_OUTPUT_TOKENS',
            1600,
          ),
          store: false,
          safety_identifier: input.safetyIdentifier,
          text: {
            format: {
              type: 'json_schema',
              name: 'vrompt_prompt',
              strict: true,
              schema: this.outputSchema(),
            },
          },
        }),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => null)) as {
        id?: string;
        status?: string;
        model?: string;
        output_text?: string;
        output?: Array<{
          content?: Array<{ type?: string; text?: string }>;
        }>;
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          total_tokens?: number;
        };
      } | null;
      if (!response.ok) {
        throw new Error(`AI provider returned ${response.status}`);
      }
      if (body?.status !== 'completed') {
        throw new Error('AI provider did not complete the response');
      }
      const content = (
        body.output_text ||
        body.output
          ?.flatMap((item) => item.content ?? [])
          .filter((item) => item.type === 'output_text')
          .map((item) => item.text ?? '')
          .join('')
      )?.trim();
      if (!content) throw new Error('AI provider returned an empty response');
      return {
        content,
        model: body.model || model,
        responseId: body.id,
        inputTokens: body.usage?.input_tokens,
        outputTokens: body.usage?.output_tokens,
        totalTokens: body.usage?.total_tokens,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
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

  private outputSchema() {
    return {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', minLength: 5, maxLength: 160 },
        description: { type: 'string', minLength: 20, maxLength: 2000 },
        content: { type: 'string', minLength: 80, maxLength: 20000 },
        variables: {
          type: 'array',
          maxItems: 20,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 80 },
              description: { type: ['string', 'null'], maxLength: 1000 },
              defaultValue: { type: ['string', 'null'], maxLength: 5000 },
              required: { type: 'boolean' },
            },
            required: ['name', 'description', 'defaultValue', 'required'],
          },
        },
        tags: {
          type: 'array',
          maxItems: 8,
          items: { type: 'string', minLength: 1, maxLength: 50 },
        },
        categorySlug: { type: ['string', 'null'], maxLength: 100 },
        audienceSlug: { type: ['string', 'null'], maxLength: 100 },
      },
      required: [
        'title',
        'description',
        'content',
        'variables',
        'tags',
        'categorySlug',
        'audienceSlug',
      ],
    };
  }
}
