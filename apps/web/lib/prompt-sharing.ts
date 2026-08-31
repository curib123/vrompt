export function buildPublicPromptUrl(slug: string, origin: string) {
  return new URL(`/p/${encodeURIComponent(slug)}`, origin).toString();
}

export function buildPromptPostTemplate({
  description,
  ownerUsername,
  title,
  url,
}: {
  description: string | null;
  ownerUsername: string;
  title: string;
  url: string;
}) {
  const summary = description?.replace(/\s+/g, ' ').trim().slice(0, 220);
  const introduction = `Check out “${title}” by @${ownerUsername} on Vrompt.`;

  return [
    introduction,
    summary || null,
    `Open the public prompt: ${url}`,
    '#Vrompt #AIPrompts',
  ]
    .filter(Boolean)
    .join('\n\n');
}
