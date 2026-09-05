import Link from 'next/link';
import { PublicShell } from '@/components/brand/public-shell';
import { Icon, type IconName } from '@/components/ui/icon';
export const metadata = { title: 'Features' };
export default function Page() {
  return (
    <PublicShell>
      <p className="eyebrow">MADE FOR YOUR EVERYDAY IDEAS</p>
      <h1>A calmer way to work with AI.</h1>
      <p className="muted">
        From the first question to the next big idea, keep your thinking in one
        place.
      </p>
      <div className="model-catalog">
        {(
          [
            [
              'workflow',
              'A thoughtful default',
              'Auto selects an available model that supports your task, within your plan’s allowance. Switch to manual selection whenever you want.',
              '/auto',
            ],
            [
              'chat',
              'Conversations that stay with you',
              'Start a chat, attach supported files, stop a response, or regenerate an answer. Search and rename your saved conversations.',
              '/chat',
            ],
            [
              'folder',
              'A home for each project',
              'Group conversations and set project instructions, context, and a preferred model. Archive projects when the work is done.',
              '/projects',
            ],
            [
              'library',
              'Keep your best prompts',
              'Save instructions you use often, edit them as your work evolves, and insert them into your next chat.',
              '/saved-prompts',
            ],
            [
              'grid',
              'Repeatable workflows',
              'Build a sequence of prompts for a project. Run it when you need it and follow progress through the resulting conversation.',
              '/workflows',
            ],
            [
              'chart',
              'Know where you stand',
              'See remaining credits, daily and monthly allowances, and reset times. Manage your plan and payment status in the same workspace.',
              '/usage',
            ],
          ] as const
        ).map(([icon, title, description, href]) => (
          <article className="panel" key={title}>
            <span className="task-icon">
              <Icon name={icon as IconName} />
            </span>
            <h2>{title}</h2>
            <p className="muted">{description}</p>
            <Link href={href} className="text-link" style={{ marginTop: 20 }}>
              Explore <span>↗</span>
            </Link>
          </article>
        ))}
      </div>
    </PublicShell>
  );
}
