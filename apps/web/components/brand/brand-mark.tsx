import type { SVGProps } from 'react';

import { siteConfig } from '@/lib/seo';

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient
          id="vrompt-left"
          x1="18"
          y1="12"
          x2="58"
          y2="88"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#0F3D75" />
        </linearGradient>
        <linearGradient
          id="vrompt-right"
          x1="83"
          y1="10"
          x2="48"
          y2="77"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#14B8A6" />
          <stop offset="0.55" stopColor="#19C7B8" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path
        d="M8 13.5C7 11.7 8.3 9.5 10.4 9.5H29.8C32 9.5 34 10.7 35.1 12.6L59 54.2L49.3 71C47.2 74.7 41.9 74.7 39.8 71L8 13.5Z"
        fill="url(#vrompt-left)"
      />
      <path
        d="M46 31.5L57.1 12.5C58.2 10.6 60.2 9.5 62.4 9.5H89.6C91.7 9.5 93 11.8 91.9 13.6L61 66.5C56 75 43.7 75 38.8 66.4L29 49.4L39.4 31.5L47.2 45L55 31.5H46Z"
        fill="url(#vrompt-right)"
      />
    </svg>
  );
}

export function BrandLockup({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={inverted ? 'text-white' : 'text-[var(--brand-ink)]'}>
      <span className="flex items-center gap-3.5">
        <BrandMark className={compact ? 'size-8' : 'size-12'} />
        <span className="leading-none">
          <span
            className={
              compact
                ? 'text-xl font-bold tracking-[-0.055em]'
                : 'text-3xl font-bold tracking-[-0.065em]'
            }
          >
            Vrompt
          </span>
          {!compact ? (
            <span className="mt-2 block max-w-72 text-[0.55rem] font-semibold uppercase leading-tight tracking-[0.28em] text-[var(--brand-mid)]">
              {siteConfig.tagline}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
