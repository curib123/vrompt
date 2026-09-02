import type { Metadata } from 'next';

import LandingPage from './landing/page';
import { createPageMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: siteConfig.tagline,
  description: siteConfig.description,
  path: '/',
});

export default function HomePage() {
  return <LandingPage />;
}
