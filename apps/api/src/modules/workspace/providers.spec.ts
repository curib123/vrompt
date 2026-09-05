import { AIModel, Prisma } from '@prisma/client';
import {
  AnthropicProvider,
  emptyUsage,
  estimateCost,
  GoogleProvider,
  OpenAIProvider,
  readEvents,
} from './providers';

function stream(events: unknown[]) {
  const bytes = new TextEncoder().encode(
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''),
  );
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 7)
        controller.enqueue(bytes.slice(i, i + 7));
      controller.close();
    },
  });
}
const model = {
  providerModelId: 'exact-requested-model',
  inputPrice: new Prisma.Decimal(2),
  cachedInputPrice: new Prisma.Decimal(1),
  outputPrice: new Prisma.Decimal(4),
  additionalPrices: { cacheWriteInputPrice: 3 },
} as unknown as AIModel;
describe('Provider protocol normalization', () => {
  afterEach(() => jest.restoreAllMocks());
  it('decodes fragmented UTF-8 SSE events without corrupting responses', async () => {
    const events = [];
    for await (const e of readEvents(stream([{ text: 'Hello 世界' }])))
      events.push(e);
    expect(events).toEqual([{ text: 'Hello 世界' }]);
  });
  it.each([
    [
      new OpenAIProvider(),
      [
        { type: 'response.output_text.delta', delta: 'answer' },
        {
          type: 'response.completed',
          response: { usage: { input_tokens: 10, output_tokens: 4 } },
        },
      ],
    ],
    [
      new GoogleProvider(),
      [
        {
          candidates: [
            { content: { parts: [{ text: 'answer' }] }, finishReason: 'STOP' },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 },
        },
      ],
    ],
    [
      new AnthropicProvider(),
      [
        { type: 'message_start', message: { usage: { input_tokens: 10 } } },
        {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'answer' },
        },
        { type: 'message_delta', usage: { output_tokens: 4 } },
        { type: 'message_stop' },
      ],
    ],
  ] as const)(
    'streams provider responses and preserves selected model and usage',
    async (provider, events) => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(stream([...events])));
      const usage = emptyUsage();
      const delta = jest.fn();
      await provider.stream(
        model,
        [{ role: 'user', content: 'hi' }],
        [],
        100,
        new AbortController().signal,
        delta,
        usage,
      );
      expect(delta).toHaveBeenCalledWith('answer');
      expect(usage).toMatchObject({ input: 10, output: 4, reported: true });
      expect(JSON.stringify(fetchMock.mock.calls[0])).toContain(
        'exact-requested-model',
      );
    },
  );
  it('does not treat a disconnected stream as successful', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          stream([{ type: 'response.output_text.delta', delta: 'partial' }]),
        ),
      );
    await expect(
      new OpenAIProvider().stream(
        model,
        [{ role: 'user', content: 'hi' }],
        [],
        10,
        new AbortController().signal,
        jest.fn(),
        emptyUsage(),
      ),
    ).rejects.toThrow();
  });
  it('prices cached reads and writes separately without double-counting', () => {
    const cost = estimateCost(model, {
      input: 100,
      cached: 20,
      output: 10,
      reasoning: 2,
      reported: true,
      raw: { cache_creation_input_tokens: 10 },
    });
    expect(cost.toString()).toBe('0.00023');
  });
});
