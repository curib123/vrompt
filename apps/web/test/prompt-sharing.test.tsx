import {
  buildPromptPostTemplate,
  buildPublicPromptUrl,
} from '@/lib/prompt-sharing';

describe('prompt sharing', () => {
  it('builds a link to the public prompt detail route', () => {
    expect(
      buildPublicPromptUrl('writing-helper', 'https://vrompt.example.com'),
    ).toBe('https://vrompt.example.com/p/writing-helper');
  });

  it('creates a reusable post template containing the public link', () => {
    const url = 'https://vrompt.example.com/p/writing-helper';
    const template = buildPromptPostTemplate({
      description: 'Turn a rough idea into a polished outline.',
      ownerUsername: 'creator',
      title: 'Writing Helper',
      url,
    });

    expect(template).toContain('“Writing Helper” by @creator');
    expect(template).toContain('Turn a rough idea into a polished outline.');
    expect(template).toContain(url);
  });
});
