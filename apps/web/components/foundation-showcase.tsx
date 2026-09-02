'use client';

import { useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dropdown } from '@/components/ui/dropdown';
import { FieldGroup, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';

export function FoundationShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const { pushToast } = useToast();

  return (
    <>
      <Card className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Badge>Vrompt essentials</Badge>
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight">
              Built for prompts, not generic dashboards.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              A focused set of primitives for a fast, collaborative, and trusted
              prompt space. Every interaction keeps the brand quiet and the work
              in front.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                pushToast({
                  title: 'Message ready',
                  description: 'Helpful updates will appear here.',
                })
              }
            >
              Show a message
            </Button>
            <Button onClick={() => setModalOpen(true)} variant="secondary">
              Open modal
            </Button>
            <Dropdown
              items={[
                {
                  label: 'Open search view',
                  onSelect: () =>
                    pushToast({
                      title: 'Dropdown ready',
                      description: 'Menus close on selection and escape.',
                    }),
                },
                {
                  label: 'Reserve action',
                  onSelect: () =>
                    pushToast({
                      title: 'Reserved action',
                    }),
                },
              ]}
              label="Open dropdown"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Tooltip label="Helpful guidance appears when you focus or hover.">
              <Button variant="ghost">Show guidance</Button>
            </Tooltip>
            <Avatar name="Prompt Curator" />
            <Badge>Monochrome</Badge>
          </div>
        </div>
        <FieldGroup className="rounded-[2rem] border border-zinc-200 p-5 dark:border-zinc-800">
          <FormField
            description="Add the details people need to understand and reuse this prompt."
            label="Prompt title"
          >
            <Input placeholder="Ship the Vrompt foundation" />
          </FormField>
          <FormField label="Prompt description">
            <Textarea placeholder="Describe what makes this prompt worth saving." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1">Primary action</Button>
            <Button className="flex-1" variant="secondary">
              Secondary action
            </Button>
          </div>
        </FieldGroup>
      </Card>

      <Tabs
        items={[
          {
            id: 'states',
            label: 'States',
            content: (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="space-y-3">
                  <p className="text-sm font-medium">Loading</p>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full" />
                </Card>
                <Card className="space-y-3">
                  <p className="text-sm font-medium">Page controls</p>
                  <Pagination currentPage={1} totalPages={12} />
                </Card>
                <Card className="space-y-3">
                  <p className="text-sm font-medium">Helpful labels</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Draft-ready</Badge>
                    <Badge>Accessible</Badge>
                    <Badge>Responsive</Badge>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            id: 'routes',
            label: 'Explore views',
            content: (
              <Card className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Explore, create, save, collect, and manage prompts from one
                  focused place.
                </p>
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    '/',
                    '/explore',
                    '/search',
                    '/create',
                    '/saved',
                    '/collections',
                    '/notifications',
                    '/settings',
                  ].map((route) => (
                    <div
                      className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                      key={route}
                    >
                      {route}
                    </div>
                  ))}
                </div>
              </Card>
            ),
          },
        ]}
      />

      <Modal
        description="The modal is keyboard-dismissible and intentionally styled to match the monochrome Vrompt brand."
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title="Modal example"
      >
        <div className="space-y-4">
          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            Use this window for publish confirmation, unsaved-change prompts,
            and prompt actions.
          </p>
          <Button onClick={() => setModalOpen(false)}>Close modal</Button>
        </div>
      </Modal>
    </>
  );
}
