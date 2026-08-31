import { createSocialImage } from '@/components/seo/social-image';

export const alt = 'Vrompt — high-quality AI prompts from real creators';
export const contentType = 'image/png';
export const size = { height: 630, width: 1200 };

export default function OpenGraphImage() {
  return createSocialImage();
}
