'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { CategorySelect } from '@/components/organization/category-select';
import { TagPicker } from '@/components/organization/tag-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import type {
  PromptCreateResponse,
  PromptRepositoryDetail,
  TagOption,
} from '@/lib/api';

interface DraftVariable {
  defaultValue: string;
  description: string;
  name: string;
  required: boolean;
}

interface DraftExample {
  input: string;
  output: string;
  title: string;
}

interface EvidenceDraft {
  altText: string;
  caption: string;
  file: File;
  preview: string;
}

const blankVariable: DraftVariable = {
  defaultValue: '',
  description: '',
  name: '',
  required: false,
};

const blankExample: DraftExample = { input: '', output: '', title: '' };

export function CreatePromptForm({ variantFrom }: { variantFrom?: string }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [tags, setTags] = useState<TagOption[]>([]);
  const [aiCompatibility, setAiCompatibility] = useState('');
  const [license, setLicense] = useState('');
  const [visibility, setVisibility] = useState('PRIVATE');
  const [variables, setVariables] = useState<DraftVariable[]>([]);
  const [examples, setExamples] = useState<DraftExample[]>([]);
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<PromptCreateResponse | null>(null);

  useEffect(() => {
    if (!variantFrom || !accessToken) {
      return;
    }

    void apiRequest<PromptRepositoryDetail>(
      `/prompt-repositories/${encodeURIComponent(variantFrom)}`,
      { accessToken },
    )
      .then((source) => {
        const sourceVersion = source.currentVersion;
        setTitle(`${source.title} variation`);
        setDescription(source.description ?? '');
        setContent(sourceVersion?.content ?? '');
        setCategorySlug(source.category?.slug ?? '');
        setTags(source.promptTags.map(({ tag }) => tag));
        setAiCompatibility(source.aiCompatibility ?? '');
        setLicense(source.license ?? '');
        setMessage(
          `Prefilled from ${source.title}. Attribution will be kept automatically.`,
        );
      })
      .catch(() => setError('The original prompt could not be loaded.'));
  }, [accessToken, variantFrom]);

  const isDirty = Boolean(
    title ||
    slug ||
    description ||
    content ||
    categorySlug ||
    tags.length ||
    variables.length ||
    examples.length ||
    evidence.length,
  );

  useEffect(() => {
    if (!isDirty || created) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [created, isDirty]);

  function addEvidence(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    const available = 3 - evidence.length;

    if (available <= 0) {
      setError('Your first update already has the maximum of 3 result images.');
      return;
    }

    const validFiles = nextFiles.slice(0, available).filter((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError(`${file.name} must be a JPEG, PNG, or WebP image.`);
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} is larger than 5 MB.`);
        return false;
      }

      return true;
    });

    setEvidence((current) => [
      ...current,
      ...validFiles.map((file) => ({
        altText: '',
        caption: '',
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addEvidence(event.target.files);
    }
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addEvidence(event.dataTransfer.files);
  }

  function removeEvidence(index: number) {
    setEvidence((current) => {
      const removed = current[index];
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function moveEvidence(index: number, direction: -1 | 1) {
    setEvidence((current) => {
      const nextIndex = index + direction;
      if (!current[nextIndex]) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setCreated(null);

    if (!accessToken) {
      setError(
        'Your session expired. Sign in again before creating a prompt.',
      );
      return;
    }

    if (!content.trim()) {
      setError('Add prompt content before saving.');
      return;
    }

    setIsSaving(true);

    try {
      const repository = await apiRequest<PromptCreateResponse>(
        variantFrom
          ? `/prompt-repositories/${encodeURIComponent(variantFrom)}/variants`
          : '/prompt-repositories',
        {
          accessToken,
          body: JSON.stringify({
            aiCompatibility: aiCompatibility || undefined,
            categorySlug: categorySlug || undefined,
            content,
            description: description || undefined,
            examples: examples.filter(
              (example) => example.input || example.output,
            ),
            license: license || undefined,
            slug: slug || undefined,
            tags: tags.map((tag) => tag.name),
            title,
            variables: variables.filter((variable) => variable.name),
            visibility,
          }),
          method: 'POST',
        },
      );

      setCreated(repository);

      for (const [index, image] of evidence.entries()) {
        const body = new FormData();
        body.append('file', image.file);
        body.append('altText', image.altText);
        body.append('caption', image.caption);
        body.append('sortOrder', String(index));

        try {
          await apiRequest(
            `/prompt-versions/${repository.promptVersionId}/evidence-images`,
            {
              accessToken,
              body,
              method: 'POST',
            },
          );
        } catch (uploadError: unknown) {
          throw new Error(
            `Prompt saved, but result image ${index + 1} failed: ${
              uploadError instanceof Error
                ? uploadError.message
                : 'upload error'
            }`,
          );
        }
      }

      setMessage('Prompt and first update saved.');
      router.push(`/p/${repository.slug}`);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Prompt could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-8" onSubmit={(event) => void submit(event)}>
      <Card className="grid gap-8 border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Badge className="border-white/30 text-zinc-300">
              Create prompt
            </Badge>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
              Make the useful thing reusable.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-300">
              Start with a strong prompt. Your first update, reusable inputs,
              examples, and results stay together from the first save.
            </p>
          </div>
          <Button
            onClick={() => setIsPreview((current) => !current)}
            type="button"
            variant="secondary"
          >
            {isPreview ? 'Edit prompt' : 'Preview'}
          </Button>
        </div>
        {isPreview ? (
          <div className="rounded-[1.5rem] border border-white/20 bg-white/10 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
              Preview
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              {title || 'Untitled prompt'}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200">
              {content || 'Your prompt content will appear here.'}
            </p>
          </div>
        ) : null}
      </Card>

      {!isPreview ? (
        <>
          <Card className="grid gap-6">
            <div className="space-y-2">
              <Badge>Prompt details</Badge>
              <h2 className="text-2xl font-semibold tracking-tight">
                Name the starting point.
              </h2>
            </div>
            <FieldGroup className="sm:grid-cols-2">
              <FormField label="Title">
                <Input
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  value={title}
                />
              </FormField>
              <FormField
                description="Optional. A readable link name is created from the title if you leave this blank."
                label="Link name"
              >
                <Input
                  maxLength={180}
                  onChange={(event) => setSlug(event.target.value)}
                  value={slug}
                />
              </FormField>
            </FieldGroup>
            <FormField label="Description">
              <Textarea
                maxLength={5000}
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </FormField>
            <FieldGroup className="sm:grid-cols-2">
              <FormField label="Category">
                <CategorySelect
                  onChange={setCategorySlug}
                  value={categorySlug}
                />
              </FormField>
              <FormField label="Works well with">
                <Input
                  maxLength={120}
                  onChange={(event) => setAiCompatibility(event.target.value)}
                  placeholder="GPT-5, Claude, Gemini..."
                  value={aiCompatibility}
                />
              </FormField>
            </FieldGroup>
            <FormField
              description="Choose topics that describe what this prompt helps with."
              label="Topics"
            >
              <TagPicker onChange={setTags} value={tags} />
            </FormField>
          </Card>

          <Card className="grid gap-6">
            <div className="space-y-2">
              <Badge>Prompt content</Badge>
              <h2 className="text-2xl font-semibold tracking-tight">
                Write your first update.
              </h2>
            </div>
            <FormField
              description="This becomes the first published update of your prompt."
              label="Prompt content"
            >
              <Textarea
                className="min-h-72 font-mono text-sm leading-7"
                onChange={(event) => setContent(event.target.value)}
                placeholder="You are an expert..."
                required
                value={content}
              />
            </FormField>
            <FieldGroup className="sm:grid-cols-2">
              <FormField label="Visibility">
                <select
                  className="min-h-11 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm text-black outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  onChange={(event) => setVisibility(event.target.value)}
                  value={visibility}
                >
                  <option value="PRIVATE">Private draft</option>
                  <option value="UNLISTED">Unlisted</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </FormField>
              <FormField label="License">
                <Input
                  maxLength={120}
                  onChange={(event) => setLicense(event.target.value)}
                  placeholder="CC BY 4.0"
                  value={license}
                />
              </FormField>
            </FieldGroup>
          </Card>

          <Card className="grid gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge>Variables</Badge>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Make inputs explicit.
                </h2>
              </div>
              <Button
                disabled={variables.length >= 20}
                onClick={() =>
                  setVariables((current) => [...current, { ...blankVariable }])
                }
                type="button"
                variant="secondary"
              >
                Add variable
              </Button>
            </div>
            {variables.map((variable, index) => (
              <div
                className="grid gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-[1fr_1fr_auto]"
                key={`variable-${index}`}
              >
                <Input
                  aria-label={`Variable ${index + 1} name`}
                  onChange={(event) =>
                    updateVariable(setVariables, index, {
                      name: event.target.value,
                    })
                  }
                  placeholder="topic"
                  value={variable.name}
                />
                <Input
                  aria-label={`Variable ${index + 1} default`}
                  onChange={(event) =>
                    updateVariable(setVariables, index, {
                      defaultValue: event.target.value,
                    })
                  }
                  placeholder="Default value"
                  value={variable.defaultValue}
                />
                <Button
                  onClick={() =>
                    setVariables((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            ))}
            {variables.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No variables yet. Add one when your prompt has reusable inputs.
              </p>
            ) : null}
          </Card>

          <Card className="grid gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge>Examples</Badge>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Show the transformation.
                </h2>
              </div>
              <Button
                disabled={examples.length >= 10}
                onClick={() =>
                  setExamples((current) => [...current, { ...blankExample }])
                }
                type="button"
                variant="secondary"
              >
                Add example
              </Button>
            </div>
            {examples.map((example, index) => (
              <div
                className="grid gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
                key={`example-${index}`}
              >
                <div className="flex justify-between gap-4">
                  <Input
                    aria-label={`Example ${index + 1} title`}
                    onChange={(event) =>
                      updateExample(setExamples, index, {
                        title: event.target.value,
                      })
                    }
                    placeholder="Example title (optional)"
                    value={example.title}
                  />
                  <Button
                    onClick={() =>
                      setExamples((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Textarea
                    aria-label={`Example ${index + 1} input`}
                    onChange={(event) =>
                      updateExample(setExamples, index, {
                        input: event.target.value,
                      })
                    }
                    placeholder="Example input"
                    value={example.input}
                  />
                  <Textarea
                    aria-label={`Example ${index + 1} output`}
                    onChange={(event) =>
                      updateExample(setExamples, index, {
                        output: event.target.value,
                      })
                    }
                    placeholder="Example output"
                    value={example.output}
                  />
                </div>
              </div>
            ))}
            {examples.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Examples are optional, but they make a prompt easier to trust.
              </p>
            ) : null}
          </Card>

          <Card className="grid gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge>Results images</Badge>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Show the result.
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {evidence.length}/3 images. Optional captions and image
                  descriptions stay with your first update.
                </p>
              </div>
            </div>
            <label
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-6 text-center transition hover:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-white"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <span className="text-sm font-medium">
                Drop images here or choose files
              </span>
              <span className="mt-2 text-xs text-zinc-500">
                JPEG, PNG, or WebP up to 5 MB each
              </span>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={evidence.length >= 3}
                multiple
                onChange={handleFileChange}
                type="file"
              />
            </label>
            {evidence.map((image, index) => (
              <div
                className="grid gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-[8rem_1fr_auto]"
                key={image.preview}
              >
                {/* Object URLs are used here for an immediate local draft preview. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={image.altText || `Result image ${index + 1}`}
                  className="aspect-square w-32 rounded-2xl object-cover"
                  src={image.preview}
                />
                <div className="grid gap-3">
                  <Input
                    aria-label={`Result ${index + 1} image description`}
                    onChange={(event) =>
                      updateEvidence(setEvidence, index, {
                        altText: event.target.value,
                      })
                    }
                    placeholder="Image description (optional)"
                    value={image.altText}
                  />
                  <Input
                    aria-label={`Result ${index + 1} caption`}
                    onChange={(event) =>
                      updateEvidence(setEvidence, index, {
                        caption: event.target.value,
                      })
                    }
                    placeholder="Caption (optional)"
                    value={image.caption}
                  />
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <Button
                    aria-label={`Move result image ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => moveEvidence(index, -1)}
                    type="button"
                    variant="ghost"
                  >
                    Up
                  </Button>
                  <Button
                    aria-label={`Move result image ${index + 1} down`}
                    disabled={index === evidence.length - 1}
                    onClick={() => moveEvidence(index, 1)}
                    type="button"
                    variant="ghost"
                  >
                    Down
                  </Button>
                  <Button
                    aria-label={`Remove result image ${index + 1}`}
                    onClick={() => removeEvidence(index)}
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          {error ? (
            <Card
              aria-live="assertive"
              className="border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300"
              role="alert"
            >
              {error}
            </Card>
          ) : null}
          {message ? (
            <Card
              aria-live="polite"
              className="border-emerald-200 bg-emerald-50 text-sm text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300"
              role="status"
            >
              {message}
            </Card>
          ) : null}
          {created && error ? (
            <Link
              className="text-sm font-semibold underline"
              href={`/p/${created.slug}`}
            >
              Open your saved prompt
            </Link>
          ) : null}
          <div className="flex justify-end">
            <Button disabled={isSaving} type="submit">
              {isSaving ? 'Saving prompt...' : 'Save prompt'}
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}

function updateVariable(
  setVariables: React.Dispatch<React.SetStateAction<DraftVariable[]>>,
  index: number,
  patch: Partial<DraftVariable>,
) {
  setVariables((current) =>
    current.map((variable, itemIndex) =>
      itemIndex === index ? { ...variable, ...patch } : variable,
    ),
  );
}

function updateExample(
  setExamples: React.Dispatch<React.SetStateAction<DraftExample[]>>,
  index: number,
  patch: Partial<DraftExample>,
) {
  setExamples((current) =>
    current.map((example, itemIndex) =>
      itemIndex === index ? { ...example, ...patch } : example,
    ),
  );
}

function updateEvidence(
  setEvidence: React.Dispatch<React.SetStateAction<EvidenceDraft[]>>,
  index: number,
  patch: Partial<EvidenceDraft>,
) {
  setEvidence((current) =>
    current.map((image, itemIndex) =>
      itemIndex === index ? { ...image, ...patch } : image,
    ),
  );
}
