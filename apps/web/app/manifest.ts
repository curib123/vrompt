import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vrompt — High-Quality AI Prompts',
    short_name: 'Vrompt',
    description:
      'Discover, copy, save, and improve high-quality AI prompts shared by experienced creators.',
    start_url: '/search',
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
