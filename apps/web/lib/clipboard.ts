export async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Clipboard unavailable');
  }
}

export function getCopyClientKey() {
  const storageKey = 'vrompt-copy-client-key';

  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;

    const value = crypto.randomUUID();
    window.localStorage.setItem(storageKey, value);
    return value;
  } catch {
    return crypto.randomUUID();
  }
}
