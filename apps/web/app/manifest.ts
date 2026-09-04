import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vrompt — Find AI Prompts That Work',
    short_name: 'Vrompt',
    description:
      'Find AI prompts that work. Save them, make them better, and create Variants while preserving attribution and lineage.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0D0D0D',
    icons: [
      {
        src: '/vrompt-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
