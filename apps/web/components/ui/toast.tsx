'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast: ({ description, title }) => {
        const id = Date.now();
        setMessages((current) => [...current, { id, title, description }]);

        window.setTimeout(() => {
          setMessages((current) => current.filter((message) => message.id !== id));
        }, 2400);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 md:left-auto md:right-6 md:w-80"
      >
        {messages.map((message) => (
          <div
            className={cn(
              'rounded-[1.5rem] border border-zinc-300 bg-white px-4 py-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-950',
            )}
            key={message.id}
            role="status"
          >
            <p className="text-sm font-semibold text-black dark:text-white">
              {message.title}
            </p>
            {message.description ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {message.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}
