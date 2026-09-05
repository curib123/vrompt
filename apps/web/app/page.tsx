import Link from 'next/link';

import { BrandLockup } from '@/components/brand/brand-mark';

const models = [
  ['Auto', 'Best for your task', '✦'],
  ['ChatGPT', 'General & creative', 'G'],
  ['Claude', 'Analysis & writing', 'C'],
  ['Gemini', 'Multimodal work', '◆'],
];

export default function Home() {
  return (
    <>
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
              {models.map(([name, detail, icon]) => (
                <div className="model-card" key={name}>
                  <span className="model-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <strong>{name}</strong>
                  <span>{detail}</span>
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
    </>
  );
}
