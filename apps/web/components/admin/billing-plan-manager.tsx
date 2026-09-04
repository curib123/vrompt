'use client';

import { FormEvent, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  deleteAdminBillingPlan,
  saveAdminBillingPlan,
  type AdminBillingPlan,
} from '@/lib/api';

type LimitDraft = {
  id: string;
  featureKey: string;
  featureName: string;
  unitLabel: string;
  resetPeriod: 'DAILY' | 'MONTHLY';
  limit: string;
  warningAt: string;
};

const emptyLimit = (): LimitDraft => ({
  id: crypto.randomUUID(),
  featureKey: 'ai.generation',
  featureName: 'AI generation',
  unitLabel: 'generations',
  resetPeriod: 'DAILY',
  limit: '10',
  warningAt: '80',
});

export function BillingPlanManager({
  accessToken,
  initialPlans,
}: {
  accessToken: string;
  initialPlans: AdminBillingPlan[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [editing, setEditing] = useState<AdminBillingPlan | null>(null);
  const [limits, setLimits] = useState<LimitDraft[]>([emptyLimit()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function beginEdit(plan: AdminBillingPlan) {
    setEditing(plan);
    setLimits(
      plan.limits.map((item) => ({
        id: item.id,
        featureKey: item.feature.key,
        featureName: item.feature.name,
        unitLabel: item.feature.unitLabel,
        resetPeriod: item.resetPeriod,
        limit: item.limit === null ? '' : String(item.limit),
        warningAt: String(item.warningAt),
      })),
    );
    setError('');
  }

  function resetForm() {
    setEditing(null);
    setLimits([emptyLimit()]);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await saveAdminBillingPlan(
        accessToken,
        {
          code: form.get('code'),
          name: form.get('name'),
          description: form.get('description'),
          originalPrice: Math.round(Number(form.get('price')) * 100),
          currency: String(form.get('currency')).toUpperCase(),
          billingInterval: form.get('billingInterval'),
          intervalCount: Number(form.get('intervalCount')),
          isActive: form.get('isActive') === 'on',
          displayOrder: Number(form.get('displayOrder')),
          limits: limits.map((item) => ({
            featureKey: item.featureKey,
            featureName: item.featureName,
            unitLabel: item.unitLabel,
            resetPeriod: item.resetPeriod,
            limit: item.limit === '' ? null : Number(item.limit),
            warningAt: Number(item.warningAt),
          })),
        },
        editing?.id,
      );
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Plan could not be saved.',
      );
      setBusy(false);
    }
  }

  async function remove(plan: AdminBillingPlan) {
    if (
      !window.confirm(
        `Delete ${plan.name}? Plans with billing history cannot be deleted.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await deleteAdminBillingPlan(accessToken, plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      if (editing?.id === plan.id) resetForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Plan could not be deleted.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Subscription plans</h2>
          <p className="mt-1 text-sm text-brand-mid">
            Create and revise prices, billing periods, availability, and metered
            feature limits.
          </p>
        </div>
        {editing ? (
          <Button onClick={resetForm} variant="secondary">
            Create new plan
          </Button>
        ) : null}
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {plans.map((plan) => (
          <div
            className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
            key={plan.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong>{plan.name}</strong>
                <p className="text-xs text-brand-mid">
                  {plan.code} · {formatMoney(plan.originalPrice, plan.currency)}{' '}
                  · {plan.billingInterval.toLowerCase()}
                </p>
              </div>
              <Badge>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="mt-3 text-sm text-brand-mid">{plan.description}</p>
            <p className="mt-2 text-xs text-brand-mid">
              {plan.limits.length} configured limit
              {plan.limits.length === 1 ? '' : 's'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => beginEdit(plan)} variant="secondary">
                Edit
              </Button>
              {plan.code !== 'FREE' ? (
                <Button
                  disabled={busy}
                  onClick={() => void remove(plan)}
                  variant="secondary"
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <form
        className="mt-8 grid gap-4"
        key={editing?.id ?? 'new'}
        onSubmit={submit}
      >
        <h3 className="font-semibold">
          {editing ? `Edit ${editing.name}` : 'Create subscription plan'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            defaultValue={editing?.code}
            label="Code"
            name="code"
            required
          />
          <Field
            defaultValue={editing?.name}
            label="Name"
            name="name"
            required
          />
          <Field
            defaultValue={editing ? editing.originalPrice / 100 : 5.99}
            label="Price"
            min="0"
            name="price"
            required
            step="0.01"
            type="number"
          />
          <Field
            defaultValue={editing?.currency ?? 'USD'}
            label="Currency"
            maxLength={3}
            minLength={3}
            name="currency"
            required
          />
          <label className="grid gap-2 text-sm font-medium">
            Billing interval
            <select
              className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3"
              defaultValue={editing?.billingInterval ?? 'MONTH'}
              name="billingInterval"
            >
              <option value="DAY">Day</option>
              <option value="WEEK">Week</option>
              <option value="MONTH">Month</option>
              <option value="YEAR">Year</option>
              <option value="ONE_TIME">One time</option>
            </select>
          </label>
          <Field
            defaultValue={editing?.intervalCount ?? 1}
            label="Interval count"
            min="1"
            name="intervalCount"
            required
            type="number"
          />
          <Field
            defaultValue={editing?.displayOrder ?? plans.length * 10}
            label="Display order"
            name="displayOrder"
            required
            type="number"
          />
          <label className="flex items-center gap-2 pt-8 text-sm">
            <input
              defaultChecked={editing?.isActive ?? true}
              name="isActive"
              type="checkbox"
            />{' '}
            Available for purchase
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Description
          <textarea
            className="min-h-24 rounded-xl border border-zinc-300 bg-transparent p-3"
            defaultValue={editing?.description}
            name="description"
            required
          />
        </label>
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Feature limits</h4>
            <Button
              onClick={() => setLimits((current) => [...current, emptyLimit()])}
              type="button"
              variant="secondary"
            >
              Add limit
            </Button>
          </div>
          {limits.map((limit, index) => (
            <LimitRow
              key={limit.id}
              limit={limit}
              onChange={(next) =>
                setLimits((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? next : item,
                  ),
                )
              }
              onRemove={() =>
                setLimits((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
          ))}
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <Button disabled={busy} type="submit">
          {busy ? 'Saving…' : editing ? 'Save plan changes' : 'Create plan'}
        </Button>
      </form>
    </Card>
  );
}

function LimitRow({
  limit,
  onChange,
  onRemove,
}: {
  limit: LimitDraft;
  onChange: (value: LimitDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-2xl bg-zinc-50 p-3 sm:grid-cols-3 lg:grid-cols-7 dark:bg-zinc-950">
      <Field
        label="Feature key"
        value={limit.featureKey}
        onValueChange={(value) => onChange({ ...limit, featureKey: value })}
      />
      <Field
        label="Name"
        value={limit.featureName}
        onValueChange={(value) => onChange({ ...limit, featureName: value })}
      />
      <Field
        label="Unit"
        value={limit.unitLabel}
        onValueChange={(value) => onChange({ ...limit, unitLabel: value })}
      />
      <label className="grid gap-2 text-xs font-medium">
        Reset
        <select
          className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-2"
          value={limit.resetPeriod}
          onChange={(event) =>
            onChange({
              ...limit,
              resetPeriod: event.target.value as LimitDraft['resetPeriod'],
            })
          }
        >
          <option value="DAILY">Daily</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </label>
      <Field
        label="Limit (blank = unlimited)"
        min="1"
        type="number"
        value={limit.limit}
        onValueChange={(value) => onChange({ ...limit, limit: value })}
      />
      <Field
        label="Warn at %"
        min="1"
        max="100"
        type="number"
        value={limit.warningAt}
        onValueChange={(value) => onChange({ ...limit, warningAt: value })}
      />
      <Button onClick={onRemove} type="button" variant="secondary">
        Remove
      </Button>
    </div>
  );
}

function Field({
  label,
  onValueChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-medium">
      {label}
      <input
        className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
        {...props}
        onChange={
          onValueChange
            ? (event) => onValueChange(event.target.value)
            : undefined
        }
      />
    </label>
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    value / 100,
  );
}
