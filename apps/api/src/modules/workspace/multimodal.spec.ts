import { AIModel } from '@prisma/client';
import {
  OpenAIProvider,
  GoogleProvider,
  MistralProvider,
  AnthropicProvider,
  emptyUsage,
} from './providers';
import { AttachmentService } from './attachment.service';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const model = { providerModelId: 'requested-model' } as AIModel;
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZp0AAAAASUVORK5CYII=';
const response = (events: unknown[]) =>
  new Response(
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('') +
      'data: [DONE]\n\n',
  );

describe('Multimodal provider delivery', () => {
  afterEach(() => jest.restoreAllMocks());
  it('requests the OpenAI image tool and delivers image-only output', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      response([
        {
          type: 'response.completed',
          response: {
            output: [{ type: 'image_generation_call', result: png }],
            usage: { input_tokens: 8, output_tokens: 2 },
          },
        },
      ]),
    );
    const image = jest.fn();
    const usage = emptyUsage();
    await new OpenAIProvider().stream(
      model,
      [{ role: 'user', content: 'Draw a cat' }],
      [],
      100,
      new AbortController().signal,
      jest.fn(),
      usage,
      { feature: 'image_generation', image },
    );
    expect(image).toHaveBeenCalledWith('image/png', png);
    const body = JSON.parse(fetch.mock.calls[0]![1]!.body as string);
    expect(body.tool_choice.type).toBe('image_generation');
    expect(body.model).toBe('requested-model');
    expect(usage.raw.toolCostUnverified).toBe(true);
  });
  it('requests Gemini image modality and retains image-edit inputs', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      response([
        {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: 'image/png', data: png } }],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1290 },
        },
      ]),
    );
    const image = jest.fn();
    await new GoogleProvider().stream(
      model,
      [{ role: 'user', content: 'Make this blue' }],
      [
        {
          name: 'image.png',
          mimeType: 'image/png',
          data: Buffer.from(png, 'base64'),
        },
      ],
      2048,
      new AbortController().signal,
      jest.fn(),
      emptyUsage(),
      { feature: 'image_generation', image },
    );
    const body = JSON.parse(fetch.mock.calls[0]![1]!.body as string);
    expect(body.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE']);
    expect(body.contents[0].parts[1].inlineData.data).toBe(png);
    expect(image).toHaveBeenCalledWith('image/png', png);
  });
  it('downloads Mistral tool images through its authenticated files endpoint', async () => {
    const fetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        response([
          {
            choices: [
              {
                delta: {
                  content: [
                    {
                      type: 'tool_file',
                      tool: 'image_generation',
                      file_id: 'file-1',
                    },
                  ],
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 3, completion_tokens: 1 },
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(Buffer.from(png, 'base64')));
    const image = jest.fn();
    const usage = emptyUsage();
    await new MistralProvider().stream(
      model,
      [{ role: 'user', content: 'Draw a cat' }],
      [],
      100,
      new AbortController().signal,
      jest.fn(),
      usage,
      { feature: 'image_generation', image },
    );
    expect(fetch.mock.calls[1]![0]).toBe(
      'https://api.mistral.ai/v1/files/file-1/content',
    );
    expect(image).toHaveBeenCalledWith('image/png', png);
    expect(usage.raw.toolCostUnverified).toBe(true);
  });
  it('rejects Mistral PDFs instead of silently ignoring their contents', async () => {
    const fetch = jest.spyOn(global, 'fetch');
    await expect(
      new MistralProvider().stream(
        model,
        [{ role: 'user', content: 'Summarize' }],
        [
          {
            name: 'a.pdf',
            mimeType: 'application/pdf',
            data: Buffer.from('%PDF-'),
          },
        ],
        100,
        new AbortController().signal,
        jest.fn(),
        emptyUsage(),
      ),
    ).rejects.toMatchObject({ category: 'UNSUPPORTED_FILE' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects native image generation for Claude before a provider call', async () => {
    const fetch = jest.spyOn(global, 'fetch');
    await expect(
      new AnthropicProvider().stream(
        model,
        [],
        [],
        100,
        new AbortController().signal,
        jest.fn(),
        emptyUsage(),
        { feature: 'image_generation' },
      ),
    ).rejects.toMatchObject({ category: 'UNSUPPORTED_FEATURE' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects interrupted Gemini output even after receiving an image', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      response([
        {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: 'image/png', data: png } }],
              },
            },
          ],
        },
      ]),
    );
    await expect(
      new GoogleProvider().stream(
        model,
        [{ role: 'user', content: 'Draw' }],
        [],
        100,
        new AbortController().signal,
        jest.fn(),
        emptyUsage(),
        { feature: 'image_generation', image: jest.fn() },
      ),
    ).rejects.toMatchObject({ category: 'INTERRUPTED_STREAM' });
  });
});

describe('Private generated images', () => {
  it('stores an image separately from input files and checks ownership on reads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'vrompt-images-'));
    const old = process.env.CHAT_STORAGE_DIR;
    process.env.CHAT_STORAGE_DIR = root;
    let record: any;
    const prisma = {
      attachment: {
        create: jest.fn(async ({ data }) => {
          record = data;
          return data;
        }),
        findFirst: jest.fn(async ({ where }) =>
          where.userId === record.userId ? record : null,
        ),
      },
    };
    const service = new AttachmentService(prisma as any, {} as any);
    try {
      await service.saveGenerated('owner', 'conversation', 'image/png', png);
      expect(record.generated).toBe(true);
      expect(
        (await service.read('owner', record.id)).data.toString('base64'),
      ).toBe(png);
      await expect(service.read('other-user', record.id)).rejects.toThrow(
        'File not found',
      );
      await expect(
        service.saveGenerated(
          'owner',
          'conversation',
          'image/png',
          Buffer.from('<svg>bad</svg>').toString('base64'),
        ),
      ).rejects.toThrow();
    } finally {
      if (old === undefined) delete process.env.CHAT_STORAGE_DIR;
      else process.env.CHAT_STORAGE_DIR = old;
      await rm(root, { recursive: true, force: true });
    }
  });
});
