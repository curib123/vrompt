'use client';
import { useId, type SVGProps } from 'react';
import { useSiteSettings } from '@/components/providers/site-settings-provider';
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 100 76"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient
          id={`${id}-left`}
          x1="17"
          y1="5"
          x2="58"
          y2="73"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B82F6" />
          <stop offset=".42" stopColor="#2876C7" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient
          id={`${id}-right`}
          x1="84"
          y1="3"
          x2="44"
          y2="73"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#14B8A6" />
          <stop offset=".45" stopColor="#0ABDBB" />
          <stop offset="1" stopColor="#164B74" />
        </linearGradient>
      </defs>
      <path
        d="M48 34 62 11Q67 3 77 3H96Q100 3 97 8L63 64Q51 81 37 63L28 47Z"
        fill={`url(#${id}-right)`}
      />
      <path
        d="M3 3H20Q30 3 35 11L64 60Q59 73 49 73Q40 73 34 63L1 8Q-2 3 3 3Z"
        fill={`url(#${id}-left)`}
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
  const { siteName, tagline } = useSiteSettings();
  return (
    <span className={`brand-lockup ${inverted ? 'brand-inverted' : ''}`}>
      <BrandMark
        className={compact ? 'brand-symbol compact' : 'brand-symbol'}
      />
      <span>
        <span className={compact ? 'brand-name compact' : 'brand-name'}>
          {siteName}
        </span>
        {!compact && <span className="brand-tagline">{tagline}</span>}
      </span>
    </span>
  );
}
