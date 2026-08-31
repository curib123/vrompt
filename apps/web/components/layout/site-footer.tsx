'use client';

import Link from 'next/link';
import type { Route } from 'next';

import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';

const footerLinks = [
  { href: '/search', label: 'Home' },
  { href: '/explore', label: 'Explore prompts' },
  { href: '/landing', label: 'Landing' },
] as const;

export function SiteFooter() {
  const { isLoading, user } = useAuth();

  return (
    <footer className="mt-16 border-t border-[#E6E6E6] bg-[#F7F7F7] dark:border-[#1A1A1A] dark:bg-[#111111] sm:mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
        <div className="grid gap-5">
          <Link aria-label="Vrompt home" className="w-fit" href="/search">
            <BrandLockup compact />
          </Link>
          <p className="max-w-lg text-sm leading-7 text-[#4D4D4D] dark:text-[#BDBDBD]">
            A community library for prompts shaped by real use, shared
            experience, and better results.
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4D4D4D] dark:text-[#BDBDBD]">
            {isLoading
              ? 'Browse, save, and share prompts that improve your work.'
              : user
                ? 'Your saved prompts, collections, and profile are ready when you are.'
                : 'Browse and copy freely. Become a creator when you want to save and share.'}
          </p>
        </div>
        <div className="grid gap-6 lg:justify-items-end">
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-2">
            {footerLinks.map((link) => (
              <Link
                className="rounded-full px-4 py-2.5 text-sm font-medium text-[#4D4D4D] transition hover:bg-white hover:text-[#0D0D0D] focus-visible:bg-white dark:text-[#BDBDBD] dark:hover:bg-[#1A1A1A] dark:hover:text-white dark:focus-visible:bg-[#1A1A1A]"
                href={link.href as Route}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
            {!isLoading ? (
              <Link
                className="rounded-full px-4 py-2.5 text-sm font-medium text-[#4D4D4D] transition hover:bg-white hover:text-[#0D0D0D] focus-visible:bg-white dark:text-[#BDBDBD] dark:hover:bg-[#1A1A1A] dark:hover:text-white dark:focus-visible:bg-[#1A1A1A]"
                href={user ? `/u/${user.username}` : '/login'}
              >
                {user ? 'Your profile' : 'Sign in'}
              </Link>
            ) : null}
          </nav>
          <p className="text-xs text-[#4D4D4D] dark:text-[#BDBDBD]">
            © {new Date().getFullYear()} Vrompt
          </p>
        </div>
      </div>
    </footer>
  );
}
