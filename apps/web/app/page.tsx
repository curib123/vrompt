import { FoundationShowcase } from '@/components/foundation-showcase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchApiHealth } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const apiHealth = await fetchApiHealth();

  return (
    <div className="grid gap-8">
      <Card className="grid gap-8 overflow-hidden lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Badge>Phase 2 foundation</Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">
              The repository for AI prompts.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
              Vrompt now has a production-ready frontend shell with responsive
              navigation, reusable components, loading and error states, and
              placeholder routes ready for the real repository workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button>Explore foundation</Button>
            <Button variant="secondary">Create route shell</Button>
          </div>
        </div>
        <Card className="space-y-4 border-black bg-black text-white dark:border-white dark:bg-white dark:text-black">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600">
            Stack status
          </p>
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 dark:text-zinc-600">Frontend</p>
              <p className="text-2xl font-semibold">Ready</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 dark:text-zinc-600">API</p>
              <p className="text-2xl font-semibold">
                {apiHealth ? apiHealth.status : 'Unavailable'}
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-600">
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
