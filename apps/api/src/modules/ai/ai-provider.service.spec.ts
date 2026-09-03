import { ServiceUnavailableException } from '@nestjs/common';

import { AiProviderService } from './ai-provider.service';

describe('AiProviderService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the Responses API with strict structured output and no storage', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'resp_123',
        status: 'completed',
        model: 'gpt-5-mini-2026-01-01',
        output: [
          {
            content: [
              { type: 'output_text', text: '{"title":"A valid title"}' },
            ],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
      }),
    }) as typeof fetch;
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          AI_API_KEY: 'test-key',
          AI_API_BASE_URL: 'https://api.openai.com/v1/',
          AI_MODEL: 'gpt-5-mini',
        };
        return values[key] ?? fallback;
      }),
    };
    const service = new AiProviderService(config as never);

    const result = await service.generate({
      system: 'system',
      user: 'user',
      safetyIdentifier: 'hashed-user',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    const body = JSON.parse(request.body);
    expect(body).toEqual(
      expect.objectContaining({
        store: false,
        safety_identifier: 'hashed-user',
        text: {
          format: expect.objectContaining({
            type: 'json_schema',
            strict: true,
          }),
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ responseId: 'resp_123', totalTokens: 30 }),
    );
  });

  it('does not expose provider error details', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({
        error: { message: 'sensitive upstream detail' },
      }),
    }) as typeof fetch;
    const config = {
      get: jest.fn((key: string, fallback?: unknown) =>
        key === 'AI_API_KEY' ? 'test-key' : fallback,
      ),
    };
    const service = new AiProviderService(config as never);

    await expect(
      service.generate({
        system: 'system',
        user: 'user',
        safetyIdentifier: 'hashed-user',
      }),
    ).rejects.toEqual(
      new ServiceUnavailableException(
        'AI generation is temporarily unavailable',
      ),
    );
  });
});
