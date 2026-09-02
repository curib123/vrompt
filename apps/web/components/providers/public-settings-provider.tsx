'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiRequest } from '@/lib/api';

export type PublicSettings = {
  'branding.siteName': string;
  'branding.tagline': string;
  'content.announcement': string;
  'features.registrationEnabled': boolean;
  'features.showCommunityStats': boolean;
  'features.showRecommendations': boolean;
  'privacy.analyticsEnabled': boolean;
};

const defaults: PublicSettings = {
  'branding.siteName': 'Vrompt',
  'branding.tagline': 'Find AI Prompts That Work. Save Them. Make Them Better.',
  'content.announcement': '',
  'features.registrationEnabled': true,
  'features.showCommunityStats': true,
  'features.showRecommendations': true,
  'privacy.analyticsEnabled': true,
};

const Context = createContext<PublicSettings>(defaults);

export function PublicSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaults);
  useEffect(() => {
    let active = true;
    void apiRequest<Partial<PublicSettings>>('/settings/public')
      .then((value) => {
        if (active) setSettings((current) => ({ ...current, ...value }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return <Context.Provider value={settings}>{children}</Context.Provider>;
}

export function usePublicSettings() {
  return useContext(Context);
}

export function FeatureGate({
  children,
  setting,
}: {
  children: ReactNode;
  setting: keyof PublicSettings;
}) {
  const settings = usePublicSettings();
  return settings[setting] === false ? null : children;
}

export function SiteAnnouncement() {
  const message = usePublicSettings()['content.announcement'];
  return message ? (
    <div
      className="border-b border-[#D8D8D8] bg-[#F5F5F3] px-4 py-2 text-center text-xs font-medium text-brand-mid dark:border-[#292929] dark:bg-[#151515]"
      role="status"
    >
      {message}
    </div>
  ) : null;
}
