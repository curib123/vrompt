export function detectTask(content: string) {
  const text = content.trim().toLowerCase();
  const request = text.replace(/^(?:(?:please|kindly)\s+|(?:can|could|would|will)\s+you\s+)+/, '');
  // Only explicit creation requests trigger tools; mentions, questions and
  // instructions quoted inside a document remain ordinary chat.
  if (!/^(?:create|generate|make|draw|design|write|export|save|prepare|produce)\b/.test(request))
    return { feature: 'chat' as const };
  const opening = request.split(/[\n.!?]/, 1)[0]!.slice(0, 180);
  if (/\b(?:image|picture|photo|illustration|logo|drawing)\b/.test(opening) &&
      !/\b(?:prompt|instructions|tutorial|code|script|essay|article)\b/.test(opening))
    return { feature: 'image_generation' as const };
  if (/\b(?:file|document|report|spreadsheet|pdf|docx|xlsx|csv|markdown|txt)\b/.test(opening)) {
    const unsupported = /\b(pdf|docx|xlsx|pptx|zip)\b/.exec(opening)?.[1];
    return {
      feature: 'file_generation' as const,
      fileFormat: (/\bcsv\b/.test(opening) ? 'csv' : /\b(?:txt|text file)\b/.test(opening) ? 'txt' : 'md') as 'csv' | 'txt' | 'md',
      ...(unsupported ? { unsupportedFormat: unsupported } : {}),
    };
  }
  return { feature: 'chat' as const };
}
