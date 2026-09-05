'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { getApiBaseUrl, type ChatFile } from '@/lib/api';

export function GeneratedImage({ file }: { file: ChatFile }) {
  const { accessToken } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    let objectUrl = '';
    void fetch(`${getApiBaseUrl()}/workspace/files/${file.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Image could not be loaded.');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, accessToken]);
  return (
    <figure>
      {error ? (
        <p role="alert">{error}</p>
      ) : url ? (
        <>
          {/* Authenticated private file, fetched as a local blob. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="AI-generated image"
            style={{ maxWidth: '100%', maxHeight: 640, objectFit: 'contain' }}
          />
          <figcaption>
            <a href={url} download={file.name}>
              Download image
            </a>
          </figcaption>
        </>
      ) : (
        <p>Loading image…</p>
      )}
    </figure>
  );
}
