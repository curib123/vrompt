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
      <path d="M10 8H34L69 70L53 94L10 8Z" fill="currentColor" />
      <path d="M48 8H90L65 51L53 34H69L78 19H57L48 8Z" fill="currentColor" />
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
                ? 'text-xl font-semibold tracking-[-0.055em]'
                : 'text-3xl font-semibold tracking-[-0.065em]'
            }
          >
            Vrompt
          </span>
          {!compact ? (
            <span className="mt-2 block max-w-72 text-[0.55rem] font-semibold leading-tight">
              {siteConfig.tagline}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
