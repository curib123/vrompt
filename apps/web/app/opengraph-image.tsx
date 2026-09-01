import { createSocialImage } from '@/components/seo/social-image';
import { siteConfig } from '@/lib/seo';

export const alt = siteConfig.tagline;
export const contentType = 'image/png';
export const size = { height: 630, width: 1200 };

export default function OpenGraphImage() {
  return createSocialImage();
}
