import { ImageResponse } from 'next/og';

import { BrandMark } from '@/components/brand/brand-mark';

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#0D0D0D',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          height: '100%',
          justifyContent: 'space-between',
          padding: '64px 72px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 999,
            height: 380,
            position: 'absolute',
            right: -110,
            top: -120,
            width: 380,
          }}
        />
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '-0.05em',
          }}
        >
          <BrandMark
            style={{ height: 54, marginRight: 18, width: 54 }}
          />
          Vrompt
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: '-0.07em',
              lineHeight: 0.95,
              maxWidth: 900,
            }}
          >
            Better prompts start here.
          </div>
          <div
            style={{
              color: '#BDBDBD',
              fontSize: 25,
              lineHeight: 1.4,
              marginTop: 30,
              maxWidth: 840,
            }}
          >
            Discover high-quality AI prompts shaped by real experience.
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.2)',
            color: '#BDBDBD',
            display: 'flex',
            fontSize: 17,
            justifyContent: 'space-between',
            letterSpacing: '0.16em',
            paddingTop: 22,
            textTransform: 'uppercase',
          }}
        >
          <span>Discover · Copy · Evolve</span>
          <span>vrompt</span>
        </div>
      </div>
    ),
    { height: 630, width: 1200 },
  );
}
