'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLockup, BrandMark } from './brand-mark';
import { ProviderIcon, providerNames } from './provider-icon';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useSiteSettings } from '@/components/providers/site-settings-provider';
import { useAuth } from '@/components/providers/auth-provider';
import {
  useAuthDialog,
  SignInButton,
} from '@/components/providers/auth-dialog-provider';
import {
  PlanCards,
  usePlans,
  type PublicPlan,
} from '@/components/billing/plan-cards';
import { Icon, type IconName } from '@/components/ui/icon';
import { apiRequest, type Model } from '@/lib/api';
import { PlanBadge } from '@/components/billing/plan-badge';

export const starterTasks: {
  key: string;
  title: string;
  detail: string;
  icon: IconName;
}[] = [
  {
    key: 'write',
    title: 'Write',
    detail: 'Find the right words',
    icon: 'write',
  },
  {
    key: 'analyze',
    title: 'Analyze',
    detail: 'Turn questions into clarity',
    icon: 'chart',
  },
  {
    key: 'create',
    title: 'Create',
    detail: 'Bring your next idea to life',
    icon: 'cube',
  },
];

export function Landing() {
  const { settings, announcement, tagline, siteName } = useSiteSettings();
  const { user } = useAuth();
  const { openLogin } = useAuthDialog();
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const plans = usePlans();
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<Model[]>('/catalog/models', { signal: controller.signal })
      .then((data) => {
        setModels(data);
        setLoaded(true);
        setCatalogError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded(true);
          setCatalogError(true);
        }
      });
    return () => controller.abort();
  }, [attempt]);
  function begin(destination = '/chat') {
    if (user) router.push(user.role === 'ADMIN' ? '/admin' : destination);
    else openLogin(destination);
  }
  function start(event: FormEvent) {
    event.preventDefault();
    if (draft.trim())
      sessionStorage.setItem('vrompt-insert-prompt', draft.trim());
    begin('/chat');
  }
  function choosePlan(plan: PublicPlan) {
    begin(
      plan.priceCentavos === 0
        ? '/chat'
        : `/billing?plan=${encodeURIComponent(plan.id)}`,
    );
  }
  const filtered = models.filter((model) =>
    `${model.displayName} ${model.provider} ${model.capabilities.join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const brands = Object.entries(providerNames);
  return (
    <div className="brand-home landing-mvp">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {announcement && <div className="site-announcement">{announcement}</div>}
      <header className="brand-nav">
        <Link href="/" aria-label={`${siteName} home`}>
          <BrandLockup compact />
        </Link>
        <nav aria-label="Main navigation">
          <a href="#why-vrompt">Why {siteName}</a>
          <a href="#models">Models</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-actions">
          <PlanBadge />
          <ThemeToggle />
          {!user && <SignInButton className="nav-signin" />}
          <button className="primary-button" onClick={() => begin()}>
            {user ? 'Open workspace' : 'Start for Free'} <Icon name="arrow" />
          </button>
        </div>
      </header>
      <main id="main-content">
        <section className="brand-hero mvp-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="brand-pill">
              <BrandMark className="brand-symbol" /> The right AI for every
              task.
            </span>
            <h1 id="hero-title">
              One account.
              <br />
              One subscription.
              <br />
              <em>Multiple AI models.</em>
            </h1>
            <p>
              Stop switching between separate AI subscriptions. Choose the right
              AI—or let <strong>Auto</strong> choose for you.
            </p>
            <div className="brand-hero-actions">
              <button className="primary-button" onClick={() => begin()}>
                Start for Free <Icon name="arrow" />
              </button>
              <a className="text-link" href="#how-auto-works">
                See how Auto works <span aria-hidden="true">↘</span>
              </a>
            </div>
            <div className="hero-assurance">
              <Icon name="check" />
              Start free. Upgrade when you need more.
            </div>
          </div>
          <aside className="hero-hub" aria-labelledby="hub-title">
            <div className="hub-caption">
              <span className="eyebrow">SPACE FOR YOUR NEXT IDEA</span>
              <span className="hub-caption-line" aria-hidden="true" />
            </div>
            <div className="hub-intro">
              <h2 id="hub-title">
                Good ideas.
                <br />
                <em>More ways forward.</em>
              </h2>
              <p>
                From your first draft to your next discovery. Start with the
                right AI.
              </p>
            </div>
            <a className="hub-auto" href="#how-auto-works">
              <span className="hub-auto-copy">
                <span className="hub-auto-title">
                  <strong>Let Auto choose</strong>
                  <span className="hub-recommended">Recommended</span>
                </span>
                <small>A model selected to suit your task.</small>
              </span>
              <Icon name="arrow" />
            </a>
            <div className="hub-divider">
              <span>Or explore the models</span>
            </div>
            <nav className="hub-providers" aria-label="Explore AI providers">
              {brands.map(([key, name]) => (
                <a
                  href="#models"
                  key={key}
                  aria-label={`Explore ${name} models`}
                >
                  <ProviderIcon provider={key} />
                  <strong>{name}</strong>
                  <span className="hub-provider-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </nav>
            <p className="hub-note">
              One conversation. A choice of perspectives.
            </p>
          </aside>
        </section>

        <section className="provider-strip" aria-labelledby="providers-title">
          <p id="providers-title" className="eyebrow">
            LEADING AI BRANDS. ONE PLACE TO WORK.
          </p>
          <div>
            {brands.map(([key, name]) => (
              <a href="#models" key={key}>
                <ProviderIcon provider={key} />
                <span>{name}</span>
              </a>
            ))}
          </div>
          <p className="muted">
            Supported integrations. Model availability and allowances depend on
            your plan.
          </p>
        </section>

        <section
          id="why-vrompt"
          className="landing-section"
          aria-labelledby="why-title"
        >
          <div className="section-heading">
            <span className="eyebrow">WHY {siteName.toUpperCase()}</span>
            <h2 id="why-title">
              Less switching.
              <br />
              <em>More getting things done.</em>
            </h2>
            <p>
              Your questions, ideas, and conversations finally have one home.
            </p>
          </div>
          <div className="why-grid">
            {[
              {
                icon: 'grid',
                title: 'One account, more choice',
                text: 'Work with multiple AI models in one workspace. Keep the conversation going without juggling separate accounts.',
              },
              {
                icon: 'workflow',
                title: 'Start with Auto. Stay in control.',
                text: 'Auto chooses an available model for your task. Select a specific model yourself when you know what you need.',
              },
              {
                icon: 'chart',
                title: 'Know what you use',
                text: 'See your shared credits and model allowances. Upgrade from the same account when you need more room.',
              },
            ].map((item) => (
              <article key={item.title}>
                <span className="task-icon">
                  <Icon name={item.icon as IconName} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-auto-works"
          className="landing-section auto-section"
          aria-labelledby="auto-title"
        >
          <div className="section-heading">
            <span className="eyebrow">A SMARTER DEFAULT</span>
            <h2 id="auto-title">
              Your task. <em>Auto’s choice.</em>
            </h2>
            <p>Choose the right AI—or let Auto choose for you.</p>
          </div>
          <ol className="auto-steps">
            <li>
              <span>01</span>
              <h3>Tell us what you need</h3>
              <p>Write a prompt, ask a question, or start with an idea.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Auto finds a fit</h3>
              <p>
                It considers the task, capabilities, model availability, and
                your plan.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Keep moving forward</h3>
              <p>See which model answered. Switch models whenever you want.</p>
            </li>
          </ol>
          <div className="landing-composer">
            <div className="preview-heading">
              <div>
                <span className="eyebrow">YOUR NEXT GOOD IDEA STARTS HERE</span>
                <h3>What will you make today?</h3>
              </div>
              <span className="auto-badge">
                <ProviderIcon provider="auto" /> Auto <small>Recommended</small>
              </span>
            </div>
            <form className="preview-composer" onSubmit={start}>
              <label className="sr-only" htmlFor="homepage-prompt">
                Your message
              </label>
              <textarea
                id="homepage-prompt"
                placeholder="Ask a question. Draft something. Think it through…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={10000}
              />
              <div>
                <span>
                  <Icon name="shield" />
                  Your own private workspace
                </span>
                <button type="submit" aria-label="Open chat with your message">
                  <Icon name="arrow" />
                </button>
              </div>
            </form>
            <div className="task-cards">
              {starterTasks.map((task) => (
                <button
                  key={task.key}
                  onClick={() => {
                    setDraft(
                      String(
                        settings[`workspace.${task.key}Prompt`] ||
                          `Help me ${task.title.toLowerCase()}.`,
                      ),
                    );
                    document.getElementById('homepage-prompt')?.focus();
                  }}
                >
                  <span className={`task-icon ${task.key}`}>
                    <Icon name={task.icon} />
                  </span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.detail}</small>
                  </span>
                  <span className="task-arrow">↗</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          id="models"
          className="landing-section"
          aria-labelledby="models-title"
        >
          <div className="section-heading">
            <span className="eyebrow">DIFFERENT STRENGTHS. ONE WORKSPACE.</span>
            <h2 id="models-title">
              Meet your <em>AI lineup.</em>
            </h2>
            <p>
              Use Auto — Recommended, or choose a specific model for your next
              task.
            </p>
          </div>
          <div className="model-section-toolbar">
            <label>
              <Icon name="search" />
              <input
                aria-label="Search models"
                placeholder="Find a model or provider…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="secondary-button"
              onClick={() => begin('/chat?model=AUTO')}
            >
              <ProviderIcon provider="auto" />
              Start with Auto
            </button>
          </div>
          {!loaded && (
            <p role="status" className="muted">
              Loading the model lineup…
            </p>
          )}
          {catalogError && (
            <div role="alert" className="service-notice">
              <p>The model catalog is temporarily unavailable.</p>
              <button
                className="text-link"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          )}
          <div className="landing-model-grid">
            {filtered.map((model) => (
              <article key={model.id}>
                <div className="model-card-heading">
                  <ProviderIcon provider={model.provider} />
                  <span className="eyebrow">
                    {providerNames[model.provider.toLowerCase()] ||
                      model.provider}
                  </span>
                </div>
                <h3>{model.displayName}</h3>
                <p>{model.description}</p>
                <div className="capability-list">
                  {model.capabilities
                    .filter((capability) =>
                      [
                        'text',
                        'coding',
                        'vision',
                        'reasoning',
                        'image_generation',
                      ].includes(capability),
                    )
                    .map((capability) => (
                      <span key={capability} className="status-badge">
                        {capability.replaceAll('_', ' ')}
                      </span>
                    ))}
                </div>
                {model.available === false && (
                  <small className="model-availability">
                    Temporarily unavailable
                  </small>
                )}
                <button
                  className="text-link"
                  onClick={() =>
                    begin(`/chat?model=${encodeURIComponent(model.id)}`)
                  }
                >
                  Explore in chat <Icon name="arrow" />
                </button>
              </article>
            ))}
          </div>
          {loaded && !catalogError && !filtered.length && (
            <div className="service-notice">
              <p>
                {query
                  ? 'No models match your search.'
                  : 'The model lineup is currently offline. You can create your account and explore the workspace.'}
              </p>
              {query ? (
                <button className="text-link" onClick={() => setQuery('')}>
                  Show all models
                </button>
              ) : (
                <button className="text-link" onClick={() => begin()}>
                  Create your free account <Icon name="arrow" />
                </button>
              )}
            </div>
          )}
        </section>

        <section
          id="pricing"
          className="landing-section pricing-section"
          aria-labelledby="pricing-title"
        >
          <div className="section-heading">
            <span className="eyebrow">ONE PLAN. MORE POSSIBILITIES.</span>
            <h2 id="pricing-title">
              Start free.
              <br />
              <em>Grow at your own pace.</em>
            </h2>
            <p>
              Choose the allowance that fits your work. Every plan keeps your AI
              in one place.
            </p>
          </div>
          {plans.data ? (
            <PlanCards plans={plans.data.plans} onChoose={choosePlan} />
          ) : (
            !plans.error && <p role="status">Loading plans…</p>
          )}
          {plans.error && (
            <div className="service-notice" role="alert">
              <p>We couldn’t load current pricing.</p>
              <button className="text-link" onClick={plans.retry}>
                Retry pricing
              </button>
            </div>
          )}
          {plans.data && !plans.data.plans.length && (
            <div className="service-notice">
              <p>
                Paid plans are currently unavailable. Start with a free account
                to explore {siteName}.
              </p>
              <button className="primary-button" onClick={() => begin()}>
                Start for Free
              </button>
            </div>
          )}
          <p className="pricing-footnote">
            Shared credits and individual model limits both apply. Paid access
            is renewed by checkout; your card is not automatically charged.
          </p>
        </section>

        <section className="brand-cta final-cta">
          <BrandMark className="brand-symbol" />
          <div>
            <span className="eyebrow">LESS SWITCHING. YOUR NEXT STEP.</span>
            <h2>
              One account.
              <br />
              Your next great idea.
            </h2>
            <p>Start using multiple AI models from one account today.</p>
          </div>
          <button className="primary-button" onClick={() => begin()}>
            Get Started <Icon name="arrow" />
          </button>
        </section>
      </main>
      <footer className="brand-footer">
        <div>
          <BrandLockup compact />
          <p>{tagline}</p>
        </div>
        <nav aria-label="Footer">
          <a href="#why-vrompt">Why {siteName}</a>
          <a href="#models">Models</a>
          <a href="#pricing">Pricing</a>
          <Link href="/docs">Help</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/staff/login">Admin</Link>
        </nav>
        <span>
          © {new Date().getFullYear()} {siteName}
        </span>
      </footer>
    </div>
  );
}
