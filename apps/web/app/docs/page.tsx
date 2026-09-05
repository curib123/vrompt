import Link from 'next/link';
import { PublicShell } from '@/components/brand/public-shell';
export const metadata = { title: 'Help & getting started' };
export default function Page() {
  return (
    <PublicShell>
      <p className="eyebrow">A LITTLE GUIDANCE</p>
      <h1>Make yourself at home.</h1>
      <p className="muted">
        Everything you need to get started with your AI workspace.
      </p>
      <section className="panel">
        <h2>Your first conversation</h2>
        <ol className="help-steps">
          <li>Open a new chat and describe what you want to work on.</li>
          <li>Start with Auto, or choose a model available on your plan.</li>
          <li>
            Add supported files with Attach when your allowance includes files.
          </li>
          <li>
            Send your message. You can stop generation or continue with a
            follow-up.
          </li>
        </ol>
        <Link href="/chat" className="primary-button">
          Start a conversation
        </Link>
      </section>
      <section className="panel">
        {[
          [
            'How does Auto choose a model?',
            'Auto considers the task, model capabilities, availability, and the routing policy for your plan. Every response identifies the model that answered.',
          ],
          [
            'Can I try a chat before signing in?',
            'Temporary guest chat is available when enabled by the administrator. Sign in with Google or GitHub to save conversations and access your personal workspace. Guest messages are not automatically imported into a new account.',
          ],
          [
            'How do projects and workflows work?',
            'Create a project with instructions and context, then add conversations. Workflows run a sequence of saved steps on demand within that project. Availability and step limits depend on your plan.',
          ],
          [
            'What happens when I reach a limit?',
            'The workspace shows remaining daily and monthly allowances and credits. Wait for the displayed reset or review the available plans in Billing. Stopped requests may count if processing has already occurred.',
          ],
          [
            'How do I change my default model?',
            'Open Settings, choose an available default model, and save preferences. New chats use that model when available; otherwise, they start with Auto.',
          ],
          [
            'How can I remove my work?',
            'Delete conversations and their attached files from Conversations. Remove saved prompts from Library. These actions require confirmation.',
          ],
          [
            'Why is a model or attachment option unavailable?',
            'A model must be enabled and configured, supported by its provider, and included in your plan. Attachment and image-generation controls also depend on the selected model and your remaining allowance.',
          ],
        ].map(([title, body]) => (
          <details className="help-question" key={title}>
            <summary>{title}</summary>
            <p className="muted">{body}</p>
          </details>
        ))}
      </section>
    </PublicShell>
  );
}
