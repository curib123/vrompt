'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLockup, BrandMark } from './brand-mark';
import { ProviderIcon } from './provider-icon';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useSiteSettings } from '@/components/providers/site-settings-provider';
import { Icon, type IconName } from '@/components/ui/icon';
import { apiRequest, type Model } from '@/lib/api';
import { SignInButton } from '@/components/providers/auth-dialog-provider';

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
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<Model[]>('/catalog/models', { signal: controller.signal })
      .then((data) => {
        setModels(data);
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded(true);
          setCatalogError(true);
        }
      });
    return () => controller.abort();
  }, []);
  function start(event: FormEvent) {
    event.preventDefault();
    if (draft.trim())
      sessionStorage.setItem('vrompt-insert-prompt', draft.trim());
    router.push('/chat');
  }
  return (
    <div className="brand-home">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {announcement && <div className="site-announcement">{announcement}</div>}
      <header className="brand-nav">
        <Link href="/" aria-label={`${siteName} home`}>
          <BrandLockup compact />
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/features">Why {siteName}</Link>
          <Link href="/models">Models</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <SignInButton className="nav-signin" />
          <Link href="/chat" className="primary-button">
            Get started <Icon name="arrow" />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="brand-hero">
          <div className="hero-copy">
            <span className="brand-pill">
              <span className="status-dot" /> A little less switching. A lot
              more doing.
            </span>
            <h1>
              The right AI
              <br />
              for <em>every task.</em>
            </h1>
            <p>
              {String(
                settings['content.heroDescription'] ||
                  'Use multiple leading AI models from one account. Auto chooses for you, or select one manually anytime.',
              )}
            </p>
            <div className="brand-hero-actions">
              <Link className="primary-button" href="/chat">
                Find your flow <Icon name="arrow" />
              </Link>
              <Link className="text-link" href="/auto">
                Meet Auto <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="hero-assurance">
              <Icon name="shield" /> One account. Your own private workspace.
            </div>
          </div>
          <div className="identity-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <span className="orbit-label orbit-label-top">LESS FRICTION</span>
            <div className="identity-tile">
              <BrandMark />
            </div>
            <div className="floating-card floating-write">
              <span className="task-icon">
                <Icon name="write" />
              </span>
              <span>
                Make it sound like you.<small>WRITE WITH CLARITY</small>
              </span>
            </div>
            <div className="floating-card floating-create">
              <span className="task-icon teal">
                <Icon name="cube" />
              </span>
              <span>
                A spark for your next idea.<small>CREATE SOMETHING NEW</small>
              </span>
            </div>
            <span className="orbit-spark spark-one">✦</span>
            <span className="orbit-spark spark-two">✦</span>
            <span className="orbit-label orbit-label-bottom">
              MORE POSSIBILITY
            </span>
          </div>
        </section>
        <section
          className="workspace-showcase"
          aria-labelledby="showcase-title"
        >
          <div className="showcase-label">
            <span className="eyebrow">YOUR IDEAS. MEET YOUR WORKSPACE.</span>
            <span>Thoughtfully simple. Quietly powerful.</span>
          </div>
          <div className="preview-window">
            <aside className="preview-sidebar">
              <BrandLockup compact />
              <Link href="/chat" className="preview-active">
                <Icon name="chat" /> New chat <span>＋</span>
              </Link>
              <Link href="/conversations">
                <Icon name="history" /> Conversations
              </Link>
              <Link href="/projects">
                <Icon name="folder" /> Projects
              </Link>
              <Link href="/saved-prompts">
                <Icon name="library" /> Library
              </Link>
              <Link href="/workflows">
                <Icon name="workflow" /> Workflows
              </Link>
              <div className="preview-sidebar-bottom">
                <Link href="/settings">
                  <Icon name="settings" /> Settings
                </Link>
                <Link href="/docs">
                  <Icon name="help" /> Help & getting started
                </Link>
              </div>
              <span className="preview-tagline">{tagline}</span>
            </aside>
            <div className="preview-workspace">
              <div className="preview-heading">
                <div>
                  <span className="eyebrow">A FRESH START</span>
                  <h2 id="showcase-title">What will you make today?</h2>
                  <p>
                    The right AI for <span>every task.</span>
                  </p>
                </div>
                <Link href="/auto" className="auto-badge">
                  <ProviderIcon provider="auto" /> Auto{' '}
                  <small>Recommended</small>
                </Link>
              </div>
              <form className="preview-composer" onSubmit={start}>
                <label className="sr-only" htmlFor="homepage-prompt">
                  Your message
                </label>
                <textarea
                  id="homepage-prompt"
                  placeholder="An idea, a question, a little help getting started…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={10000}
                />
                <div>
                  <span>
                    <Icon name="attach" /> Start here. Take it anywhere.
                  </span>
                  <button
                    type="submit"
                    aria-label="Open chat with your message"
                  >
                    <Icon name="arrow" />
                  </button>
                </div>
              </form>
              <div className="available-models">
                <Link className="model-choice selected" href="/chat">
                  <ProviderIcon provider="auto" />
                  <span>
                    <strong>Auto</strong>
                    <small>Matched to your task</small>
                  </span>
                </Link>
                {models.slice(0, 4).map((model) => (
                  <Link className="model-choice" href="/models" key={model.id}>
                    <ProviderIcon provider={model.provider} />
                    <span>
                      <strong>{model.displayName}</strong>
                      <small>{model.provider.toLowerCase()}</small>
                    </span>
                  </Link>
                ))}
              </div>
              <p className="catalog-note">
                {!loaded
                  ? 'Loading available models…'
                  : catalogError
                    ? 'Model availability will appear when the service reconnects.'
                    : models.length
                      ? `${models.length} available models. Access varies by plan.`
                      : 'Models will appear here when they are enabled.'}
              </p>
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
          </div>
        </section>
        <section className="brand-benefits">
          <div className="benefit-intro">
            <span className="eyebrow">AI WORKS BETTER TOGETHER</span>
            <h2>
              One account.
              <br />
              <em>Every possibility.</em>
            </h2>
            <p>
              More room for your ideas.
              <br />
              Less getting in their way.
            </p>
            <Link href="/features">
              Explore the workspace <Icon name="arrow" />
            </Link>
          </div>
          <div className="benefit-list">
            {[
              {
                icon: 'workflow',
                title: 'The choice is yours. Or Auto’s.',
                text: 'Let Auto match your task to an available model, or choose the model you want.',
              },
              {
                icon: 'folder',
                title: 'A home for your best thinking.',
                text: 'Keep conversations in projects and turn useful instructions into reusable prompts.',
              },
              {
                icon: 'shield',
                title: 'Your work stays yours.',
                text: 'Private conversations, protected files, and clear usage controls in one place.',
              },
            ].map((item) => (
              <article key={item.title}>
                <span className="task-icon">
                  <Icon name={item.icon as IconName} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="brand-cta">
          <BrandMark />
          <div>
            <h2>A smarter way to start.</h2>
            <p>Your next idea is in good company.</p>
          </div>
          <Link className="primary-button" href="/chat">
            Let’s make something <Icon name="arrow" />
          </Link>
        </section>
      </main>
      <footer className="brand-footer">
        <div>
          <BrandLockup compact />
          <p>{tagline}</p>
        </div>
        <nav aria-label="Footer">
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
