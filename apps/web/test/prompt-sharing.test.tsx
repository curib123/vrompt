import {
  buildPromptPostTemplate,
  buildPublicPromptUrl,
  buildVariantPostTemplate,
  buildVersionPostTemplate,
  getSocialShareLinks,
} from '@/lib/prompt-sharing';

describe('prompt sharing', () => {
  const metadata = {
    aiCompatibility: 'GPT-5, Claude',
    description: 'Turn a rough idea into a polished outline.',
    ownerUsername: 'creator',
    title: 'Writing Helper',
    url: 'https://vrompt.example.com/prompts/repository-id/writing-helper',
  };

  it('builds a stable id and slug public prompt URL', () => {
    expect(
      buildPublicPromptUrl(
        'repository-id',
        'writing-helper',
        'https://vrompt.example.com',
      ),
    ).toBe(metadata.url);
  });

  it('refuses to generate localhost share links', () => {
    expect(() =>
      buildPublicPromptUrl(
        'repository-id',
        'writing-helper',
        'http://localhost:3000',
      ),
    ).toThrow(/public site URL/i);
  });

  it('creates a factual default share template', () => {
    const template = buildPromptPostTemplate(metadata);
    expect(template).toContain('Writing Helper — by @creator');
    expect(template).toContain(metadata.description);
    expect(template).toContain('Works with: GPT-5, Claude');
    expect(template).toContain(`View on Vrompt: ${metadata.url}`);
  });

  it('creates variant and version templates without fabricated claims', () => {
    expect(
      buildVariantPostTemplate({
        ...metadata,
        sourcePromptTitle: 'Research Brief',
      }),
    ).toContain('a Variant based on Research Brief');
    expect(
      buildVersionPostTemplate({
        changeSummary: 'Added a source checklist.',
        title: metadata.title,
        url: metadata.url,
        version: 3,
      }),
    ).toContain('Version 3: Added a source checklist.');
  });

  it('creates all supported platform links from the canonical URL', () => {
    expect(
      getSocialShareLinks(metadata).map(({ platform }) => platform),
    ).toEqual([
      'facebook',
      'x',
      'linkedin',
      'reddit',
      'email',
      'whatsapp',
      'telegram',
    ]);
  });
});
