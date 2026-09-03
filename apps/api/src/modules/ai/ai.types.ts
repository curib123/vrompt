import type { AiGenerationMode, AiGenerationOperation } from '@prisma/client';

export type AiPromptVariable = {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
};

export type AiPromptDraft = {
  title: string;
  description: string;
  content: string;
  variables: AiPromptVariable[];
  tags: string[];
  categorySlug?: string;
  audienceSlug?: string;
};

export type AiGenerationInput = {
  goal: string;
  categorySlug?: string;
  audienceSlug?: string;
  operation?: AiGenerationOperation;
  basePrompt?: string;
  requestId?: string;
};

export type AiGenerationContext = {
  mode: AiGenerationMode;
  input: AiGenerationInput;
  subjectKey: string;
  userId?: string;
};

export interface PromptAiProvider {
  generate(input: {
    system: string;
    user: string;
  }): Promise<{ content: string; model: string }>;
}
