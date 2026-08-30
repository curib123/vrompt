import type { SVGProps } from 'react';

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
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
    <span
      className={inverted ? 'text-white' : 'text-[#0D0D0D] dark:text-white'}
    >
      <span className="flex items-center gap-3">
        <BrandMark className={compact ? 'size-8' : 'size-11'} />
        <span className="leading-none">
          <span
            className={
              compact
                ? 'text-xl font-semibold tracking-[-0.06em]'
                : 'text-3xl font-semibold tracking-[-0.07em]'
            }
          >
            Vrompt
          </span>
          {!compact ? (
            <span className="mt-2 block text-[0.55rem] font-medium tracking-[0.34em]">
              SHARE. PROMPT. EVOLVE.
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
