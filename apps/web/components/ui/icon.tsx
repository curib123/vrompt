import type { SVGProps } from 'react';
const paths = {
  plus: 'M12 5v14M5 12h14',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3H13M16 3h6m-3-3v6',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2',
  folder: 'M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11H3Z',
  library: 'M4 3v18M9 3v18M14 3v18m3-17 4 16',
  workflow: 'M9 3h6v6H9Zm-6 12h6v6H3Zm12 0h6v6h-6Zm-3-6v3H6v3m6-3h6v3',
  chart: 'M4 20h17M7 16v-5m5 5V4m5 12V8',
  card: 'M3 5h18v14H3Zm0 5h18M7 15h3',
  settings:
    'm9 3-1 3-3 1-2 3 2 3v3l3 2 3-1 3 1 3-2v-3l2-3-2-3-3-1-1-3Zm3 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
  help: 'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  attach: 'm8 12 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l9-9m-6 12 8-8',
  write: 'M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h5',
  cube: 'm12 2 9 5v10l-9 5-9-5V7Zm0 10L3 7m9 5 9-5m-9 5v10',
  shield: 'm12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5Zm-4 10 3 3 5-6',
  users:
    'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M2 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3m0-18a4 4 0 0 1 0 8m3 3a5 5 0 0 1 3 5v2',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  menu: 'M4 6h16M4 12h12M4 18h16',
  logout: 'M9 3H3v18h6m5-14 5 5-5 5m-7-5h14',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  check: 'm5 12 4 4L19 6',
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
