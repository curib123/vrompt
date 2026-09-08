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
          <li>
            Sign in, then open a new chat and describe what you want to work on.
          </li>
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
            'What are the file and image limits?',
            'Free includes text chat only. Starter allows one selected file per message; Pro and Max allow two, up to 5 MB each. Supported uploads are PDF, PNG, JPEG and UTF-8 TXT, Markdown or CSV, subject to model support and context limits. Total storage for uploads and generated images is 50 MB on Starter, 250 MB on Pro and 1 GB on Max, with file-count caps of 100, 500 and 2,000. Delete unused files to free space; storage does not reset monthly.',
          ],
          [
            'Can I generate images or downloadable documents?',
            'Pro and Max can request one image per response, up to 10 MB. Image requests use the displayed credit price and the selected model’s daily allowance; they are not unlimited. Downloadable PDF, DOCX and spreadsheet generation is not supported. Models can write text or code for you to copy, but do not execute code or browse the web here.',
          ],
          [
            'How does Auto choose a model?',
            'Auto considers the task, model capabilities, availability, and the routing policy for your plan. Every response identifies the model that answered.',
          ],
          [
            'Can I try a chat before signing in?',
            'Sign in with Google or GitHub before using chat or any workspace tools. Your Free plan is available after sign-in. Public pages, including the landing page, pricing, help and legal pages, do not require an account.',
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
            'How do I choose a model?',
            'Every new chat starts with Auto — Recommended. Use the model selector in chat to choose an available model on your plan. Your manual choice stays selected for that conversation.',
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
