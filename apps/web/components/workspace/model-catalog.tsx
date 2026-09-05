'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, type Model } from '@/lib/api';
import { ProviderIcon } from '@/components/brand/provider-icon';
import { BrandLockup } from '@/components/brand/brand-mark';
export function ModelCatalog() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<Model[]>('/catalog/models', { signal: controller.signal })
      .then(setModels)
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const filtered = models.filter((model) =>
    `${model.displayName} ${model.provider} ${model.capabilities.join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <main className="content-page">
      <Link href="/">
        <BrandLockup compact />
      </Link>
      <p className="eyebrow" style={{ marginTop: 40 }}>
        DIFFERENT STRENGTHS. A SMARTER WHOLE.
      </p>
      <h1>Meet your models.</h1>
      <p className="muted">
        Explore the models currently available. Your plan determines which
        models and tasks you can use.
      </p>
      <div className="admin-toolbar">
        <input
          aria-label="Search models"
          placeholder="Search models, providers, or capabilities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Link className="primary-button" href="/chat">
          Start with Auto
        </Link>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="muted" role="status">
          Loading available models…
        </p>
      )}
      <div className="model-catalog">
        {filtered.map((model) => (
          <article className="panel" key={model.id}>
            <ProviderIcon provider={model.provider} />
            <h2>{model.displayName}</h2>
            <p className="eyebrow">{model.provider}</p>
            <p className="muted">{model.description}</p>
            <div className="capability-list">
              {model.capabilities.map((capability) => (
                <span className="status-badge" key={capability}>
                  {capability.replaceAll('_', ' ')}
                </span>
              ))}
            </div>
            <Link className="text-link" href="/chat">
              Open workspace <span>↗</span>
            </Link>
          </article>
        ))}
      </div>
      {!loading && !error && !filtered.length && (
        <p className="panel muted">
          {models.length
            ? 'No models match your search.'
            : 'No models are currently available. Please check back soon.'}
        </p>
      )}
    </main>
  );
}
