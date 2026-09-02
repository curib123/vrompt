import { ImageResponse } from 'next/og';

import { getPromptSeoData } from '@/lib/seo-data';

export const alt = 'A public AI prompt shared on Vrompt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function PromptOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repository = await getPromptSeoData(slug);
  const publicRepository =
    repository?.visibility === 'PUBLIC' && repository.status === 'ACTIVE'
      ? repository
      : null;
  const title = publicRepository?.title || 'Discover a better prompt';
  const creator = publicRepository?.owner.username;
  const category = publicRepository?.category?.name || 'AI Prompt';

  return new ImageResponse(
    <div
      style={{
        background: '#0D0D0D',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '70px 78px',
        width: '100%',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          fontSize: 24,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
          Vrompt
        </span>
        <span
          style={{
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: 999,
            color: '#D4D4D8',
            fontSize: 18,
            letterSpacing: '0.14em',
            padding: '12px 20px',
            textTransform: 'uppercase',
          }}
        >
          {category}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 1000,
        }}
      >
        <div
          style={{
            fontSize: title.length > 70 ? 56 : 72,
            fontWeight: 700,
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        <div style={{ color: '#A1A1AA', fontSize: 26, marginTop: 32 }}>
          {creator
            ? `Public prompt by @${creator}`
            : 'A public prompt on Vrompt'}
        </div>
      </div>
      <div
        style={{
          borderTop: '2px solid rgba(255,255,255,0.12)',
          color: '#D4D4D8',
          display: 'flex',
          fontSize: 22,
          justifyContent: 'space-between',
          paddingTop: 26,
        }}
      >
        <span>Open · Copy · Make it yours</span>
        <span>/p/{slug}</span>
      </div>
    </div>,
    size,
  );
}
