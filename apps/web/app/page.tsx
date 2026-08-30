import Link from 'next/link';

import { BrandLockup } from '@/components/brand/brand-mark';
import { FoundationShowcase } from '@/components/foundation-showcase';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getButtonClasses } from '@/components/ui/button';
import { fetchApiHealth } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const apiHealth = await fetchApiHealth();

  return (
    <div className="grid gap-8">
      <Card className="relative grid gap-10 overflow-hidden border-[#BDBDBD] p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:p-14">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border-[36px] border-[#E6E6E6] opacity-70" />
        <div className="relative space-y-8">
          <BrandLockup />
          <div className="space-y-5">
            <Badge>Prompt knowledge, made visible.</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl">
                Share the prompt.
                <br />
                Evolve the idea.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#4D4D4D] dark:text-zinc-400">
                A focused home for discovering, refining, and sharing the
                instructions that move creative work forward.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={getButtonClasses('primary')} href="/explore">
              Explore prompts
            </Link>
            <Link className={getButtonClasses('secondary')} href="/create">
              Create a prompt
            </Link>
          </div>
        </div>
        <Card className="relative flex flex-col justify-between gap-10 border-[#0D0D0D] bg-[#0D0D0D] text-white shadow-none dark:border-white dark:bg-white dark:text-[#0D0D0D]">
          <BrandLockup compact inverted />
          <div className="space-y-7">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-400 dark:text-[#4D4D4D]">
              Live workspace
            </p>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 dark:text-[#4D4D4D]">
                Frontend
              </p>
              <p className="text-3xl font-semibold tracking-[-0.05em]">
                Ready.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 dark:text-[#4D4D4D]">API</p>
              <p className="text-3xl font-semibold tracking-[-0.05em]">
                {apiHealth ? apiHealth.status : 'Unavailable'}
              </p>
              <p className="text-sm leading-6 text-zinc-400 dark:text-[#4D4D4D]">
                {apiHealth
                  ? `Postgres ${apiHealth.dependencies.postgres}, Redis ${apiHealth.dependencies.redis}`
                  : 'Connection will light up automatically once the API is running.'}
              </p>
            </div>
          </div>
        </Card>
      </Card>

      <FoundationShowcase />
    </div>
  );
}
