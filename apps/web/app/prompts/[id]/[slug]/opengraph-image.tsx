import { ImageResponse } from 'next/og';

import { getPromptSeoDataById } from '@/lib/seo-data';

export const alt = 'A public AI prompt shared on Vrompt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function PromptOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id } = await params;
  const repository = await getPromptSeoDataById(id);
  const publicRepository =
    repository?.visibility === 'PUBLIC' && repository.status === 'ACTIVE'
      ? repository
      : null;
  const title = publicRepository?.title || 'Find AI Prompts That Work';
  const creator = publicRepository?.owner.username;
  const category = publicRepository?.category?.name || 'AI Prompt';
  const compatibility = publicRepository?.aiCompatibility;

  return new ImageResponse(
    <div
      style={{
        background: '#0D0D0D',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '64px 72px',
        width: '100%',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          fontSize: 28,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700 }}>Vrompt</span>
        <span
          style={{
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: 999,
            color: '#D4D4D8',
            fontSize: 18,
            padding: '12px 20px',
          }}
        >
          {category}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1040 }}>
        <div
          style={{
            fontSize: title.length > 70 ? 54 : 70,
            fontWeight: 700,
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        <div style={{ color: '#BDBDBD', fontSize: 25, marginTop: 28 }}>
          {compatibility
            ? `Works with: ${compatibility}`
            : 'Reusable AI prompt'}
          {creator ? ` · by @${creator}` : ''}
        </div>
      </div>
      <div
        style={{
          borderTop: '2px solid rgba(255,255,255,0.12)',
          color: '#D4D4D8',
          display: 'flex',
          fontSize: 20,
          justifyContent: 'space-between',
          paddingTop: 24,
        }}
      >
        <span>Find AI Prompts That Work. Save Them. Make Them Better.</span>
        <span>Vrompt</span>
      </div>
    </div>,
    size,
  );
}
