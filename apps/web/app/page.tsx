import Link from 'next/link';

import { BrandLockup, BrandMark } from '@/components/brand/brand-mark';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const models = [
  { detail: 'Best for your task', name: 'Auto', provider: 'auto' },
  { detail: 'General & creative', name: 'ChatGPT', provider: 'openai' },
  { detail: 'Analysis & writing', name: 'Claude', provider: 'claude' },
  { detail: 'Multimodal work', name: 'Gemini', provider: 'gemini' },
  { detail: 'Open source', name: 'Llama', provider: 'meta' },
] as const;

function ProviderLogo({
  provider,
}: {
  provider: (typeof models)[number]['provider'];
}) {
  if (provider === 'claude')
    return <span className="provider-logo provider-claude">AI</span>;
  if (provider === 'gemini')
    return (
      <span className="provider-logo provider-gemini" aria-hidden="true">
        ✦
      </span>
    );
  if (provider === 'meta')
    return (
      <span className="provider-logo provider-meta" aria-hidden="true">
        ∞
      </span>
    );
  if (provider === 'auto')
    return (
      <span className="provider-logo provider-auto" aria-hidden="true">
        ✦
      </span>
    );
  return (
    <span className="provider-logo provider-openai" aria-hidden="true">
      <svg fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="6.5" r="4" />
        <circle cx="16.7" cy="9.25" r="4" />
        <circle cx="16.7" cy="14.75" r="4" />
        <circle cx="12" cy="17.5" r="4" />
        <circle cx="7.3" cy="14.75" r="4" />
        <circle cx="7.3" cy="9.25" r="4" />
      </svg>
    </span>
  );
}

export default function Home() {
  return (
    <div className="landing-page">
      <div className="landing-backdrop" aria-hidden="true">
        <BrandMark />
      </div>
      <header className="public-nav">
        <Link aria-label="Vrompt home" href="/">
          <BrandLockup compact />
        </Link>
        <nav aria-label="Main navigation">
          <Link className="optional-link" href="/features">
            Features
          </Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Sign in</Link>
          <ThemeToggle />
          <Link className="primary-button" href="/chat">
            Get started
          </Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <span className="eyebrow">ONE ACCOUNT / MORE POSSIBILITIES</span>
          <h1>
            The right AI
            <br />
            for <em>every task.</em>
          </h1>
          <p>
            Use multiple leading AI models from one account. Auto chooses for
            you, or select one manually anytime.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/chat">
              Start with Auto <span aria-hidden="true">→</span>
            </Link>
            <span className="hero-note">No provider setup required</span>
          </div>
          <div
            className="hero-console"
            aria-label="Vrompt model workspace preview"
          >
            <div className="console-header">
              <BrandLockup compact />
              <span className="console-status">Models ready</span>
            </div>
            <div className="console-prompt">
              What would you like to work on?
            </div>
            <div className="model-grid">
              {models.map((model) => (
                <div className="model-card" key={model.name}>
                  <ProviderLogo provider={model.provider} />
                  <strong>{model.name}</strong>
                  <span>{model.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="feature-grid" aria-label="Why Vrompt">
          <article className="panel">
            <p className="eyebrow">SMART ROUTING</p>
            <h2>Ask. Auto handles the choice.</h2>
            <p className="muted">
              Writing, planning, coding or documents—Auto matches your task to
              an available, capable model.
            </p>
          </article>
          <article className="panel">
            <p className="eyebrow">FULL CONTROL</p>
            <h2>Your model, your choice.</h2>
            <p className="muted">
              Choose an exact model whenever you know what you want. See which
              model answered every request.
            </p>
          </article>
          <article className="panel">
            <p className="eyebrow">ONE WORKSPACE</p>
            <h2>Keep your work together.</h2>
            <p className="muted">
              Private conversations, file attachments, projects and reusable
              prompts in one focused workspace.
            </p>
          </article>
        </section>
      </main>
      <footer className="public-footer">
        <Link href="/auto">How Auto works</Link>
        <Link href="/models">Models</Link>
        <Link href="/docs">Help</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
